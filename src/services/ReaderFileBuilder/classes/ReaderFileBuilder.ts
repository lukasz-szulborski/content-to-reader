import { tmpdir } from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

import { HtmlValidate } from "html-validate/node";
import { v4 as uuid } from "uuid";
import epubGen from "epub-gen-memory";

import {
  ArticleSnippet,
  ArticleSnippetStaticValidationResultType,
} from "@services/ReaderFileBuilder/types";
import { ReaderFile } from "@services/ReaderFileBuilder/classes/ReaderFile";

interface ReaderFileBuilderMethods {
  /**
   * Takes HTML snippets and transforms them into `ReaderFile`.
   *
   * @argument htmlSnippets - each being a section that semantically represent an article. In the best case scenario `<article>...</article>` should be the topmost element in such a snippet.
   */
  build(htmlSnippets: ArticleSnippet[]): Promise<ReaderFile>;
}

type ReaderFileBuilderClass = ReaderFileBuilderMethods;

/**
 * An object that takes HTML snippets that represent articles and turns them into EPUB file.
 *
 * @TODO
 * * **[In the future]** besides mapping HTML to epub, it will also control how the output EPUB looks like.
 * * **[In the future]** Allow different formats.
 *
 * For implementation details refer to specific functions' descriptions.
 */
export class ReaderFileBuilder implements ReaderFileBuilderClass {
  async build(htmlSnippets: ArticleSnippet[]): Promise<ReaderFile> {
    const now = new Date();
    // --- Validate input
    if (htmlSnippets.length === 0) {
      throw new Error("No snippets passed");
    }
    // Validate all articles
    const validationErrors = await this.validateArticles(htmlSnippets);
    if (Object.entries(validationErrors).length > 0) {
      throw new Error(this.articleErrorToHumanReadable(validationErrors));
    }

    // --- Build EPUB
    const epubBuffer = await epubGen(
      {
        title: `${now.getFullYear()}-${
          now.getMonth() + 1
        }-${now.getDate()} News Digest`,
        author: "kindle-news-digest",
        prependChapterTitles: true,
      },
      htmlSnippets.map((article) => ({
        content: article.htmlSnippet,
        title: article.metadata.title,
      }))
    );

    // Save file
    const filePath = path.join(tmpdir(), `knd_article_${uuid()}.epub`);
    await fs.writeFile(filePath, epubBuffer);

    return new ReaderFile({
      format: "EPUB",
      temporaryPath: filePath,
    });
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
