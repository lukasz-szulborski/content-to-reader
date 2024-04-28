import { tmpdir } from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import fsSync from "node:fs";

import { HtmlValidate } from "html-validate/node";
import { v4 as uuid } from "uuid";
import epubGen from "epub-gen-memory";

import {
  ArticleSnippet,
  ArticleSnippetStaticValidationResultType,
} from "@services/ReaderFileBuilder/types";

interface ReaderFileBuilderMethods {
  /**
   * Takes HTML snippets and transforms them into `ReaderFile`.
   *
   * @argument htmlSnippets - each being a section that semantically represent an article. In the best case scenario `<article>...</article>` should be the topmost element in such a snippet.
   */
  build(htmlSnippets: ArticleSnippet[]): Promise<unknown>;
}

type ReaderFileBuilderClass = ReaderFileBuilderMethods;

/**
 * An object that takes HTML snippets that represent articles.
 *
 * It merges those snippets into nice and tidy EPUB file (`ReaderFile`). In the future it will allow different formats.
 *
 * @TODO
 * * **[In the future]** besides mapping HTML to epub, it will also control how the output EPUB looks like.
 *
 * For implementation details refer to specific functions' descriptions.
 */
export class ReaderFileBuilder implements ReaderFileBuilderClass {
  private readonly _tmpPath: string;

  constructor(ctx?: ReaderFileBuilderContext) {
    // --- Generate a path for the temporary directory
    const tmpDirName = this.getTmpDirName(ctx?.tmpDirNameSuffix); // I assume this is unique (bcs of a single user for now :])
    const tmpDirPath = path.join(tmpdir(), tmpDirName);
    this._tmpPath = tmpDirPath;
  }

  async build(htmlSnippets: ArticleSnippet[]): Promise<unknown> {
    try {
      // --- Validate input
      if (htmlSnippets.length === 0) {
        throw new Error("No snippets passed");
      }
      // Validate all articles
      const validationErrors = await this.validateArticles(htmlSnippets);
      if (Object.entries(validationErrors).length > 0) {
        throw new Error(this.articleErrorToHumanReadable(validationErrors));
      }

      // --- Create temporary directory
      await fs.mkdir(this._tmpPath);

      // --- Build EPUB
      const epubBuffer = await epubGen(
        {
          title: "knd-001", // @TODO: what will this be? (date?)
          author: "kindle-news-digest",
          prependChapterTitles: true,
        },
        htmlSnippets.map((article) => ({
          content: article.htmlSnippet,
          title: article.metadata.title,
        }))
      );

      // Save file
      await fs.writeFile(path.join(this._tmpPath, `${uuid()}.epub`), epubBuffer);

      // --- Cleanup
      await this.rmTmpDir();

      // --- Return `ReaderFile`
    } catch (error) {
      // --- Rollback changes
      await this.rmTmpDir();

      throw error;
    }

    return;
  }

  /**
   * Validate whether given article meets certain set of rules.
   *
   * @returns set of all errors found during validation
   */
  private async validateArticle(article: ArticleSnippet) {
    const validationErrors: Set<ArticleSnippetStaticValidationResultType> =
      new Set();
    // Validate article's title
    if (!article.metadata.title || article.metadata.title.length === 0)
      validationErrors.add("EMPTY_TITLE");

    // Validate HTML
    const htmlValidator = new HtmlValidate();
    const validationRes = await htmlValidator.validateString(
      article.htmlSnippet
    );

    const isHtmlValid =
      validationRes.valid ||
      validationRes.results.find(
        (err) =>
          err.messages.find(
            (msg) => msg.ruleId === "parser-error" || msg.severity > 2
          ) !== undefined
      ) === undefined;
    if (!isHtmlValid) validationErrors.add("INVALID_HTML");

    return validationErrors;
  }

  /**
   * Validate many articles at once.
   *
   * Handles joining errors.
   */
  private async validateArticles(
    articles: ArticleSnippet[]
  ): Promise<ArticleUrlErrorsMap> {
    return (
      (
        await Promise.all(
          articles.map(async (a) => {
            const errorTypes = await this.validateArticle(a);
            if (errorTypes.size === 0) return {};
            return {
              [a.metadata.url]: errorTypes,
            };
          })
        )
      )
        // Merge all errors by url
        .reduce((acc, article) => Object.assign(acc, article), {})
    );
  }

  private articleErrorToHumanReadable(errors: ArticleUrlErrorsMap): string {
    return Object.entries(errors)
      .map(
        ([url, errorTypes]) => `${url}: [${Array.from(errorTypes).join(", ")}]`
      )
      .join("\n");
  }

  /**
   * Generates a random name for `/tmp` directory. That dir
   * is associated with EPUB that's being created.
   *
   * @argument s : A string to be included in a directory name
   * */
  private getTmpDirName(s?: string): string {
    const sanitizeText = (s: string) => s.replace("-", "_").replace(" ", "_");
    const chunks = ["knd_article", sanitizeText(uuid())];
    if (s) chunks.push(sanitizeText(s));
    return chunks.join("_");
  }

  /**
   * Remove temporary directory that was created for this instance.
   *
   * Should be called at the end of the build of during rollback after an exception.
   *
   * @returns `true` if directory was removed, `false` when not.
   */
  private async rmTmpDir(): Promise<boolean> {
    const tmpDirExists = fsSync.existsSync(this._tmpPath);
    if (tmpDirExists)
      await fs.rm(this._tmpPath, { force: true, recursive: true });
    return tmpDirExists;
  }
}

/**
 * Map where the key is the URL of the article and value is the
 * set of errors associated with that article.
 *
 * Can be returned as a result of an error joining function.
 * (multiple articles were validated)
 * */
type ArticleUrlErrorsMap = Record<
  string,
  Set<ArticleSnippetStaticValidationResultType>
>;

/**
 * Set of options for `ReaderFileBuilder` constructor.
 * */
interface ReaderFileBuilderContext {
  tmpDirNameSuffix?: string;
}
