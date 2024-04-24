import { HtmlValidate } from "html-validate/node";

import {
  ArticleSnippet,
  ArticleSnippetStaticValidationResultType,
} from "@services/ReaderFileBuilder/types";

interface ReaderFileBuilderMethods {
  /**
   * Takes HTML snippets and transforms them into `ReaderFile` that points to a binary.
   *
   * @argument htmlSnippets - each being a section that semantically represent an article. In the best case scenario `<article>...</article>` should be the topmost element in such a snippet.
   */
  build(htmlSnippets: ArticleSnippet[]): Promise<unknown>;
}

/**
 * An object that takes HTML snippets that represent various articles.
 *
 * It merges those snippets into nice and tidy EPUB file (ReaderFile). In the future it will allow different formats.
 *
 * @TODO: In the future, besides mapping HTML to epub, it will also control how the output EPUB looks like.
 *
 * For implementation details refer to specific functions' descriptions.
 */
type ReaderFileBuilderClass = ReaderFileBuilderMethods;
export class ReaderFileBuilder implements ReaderFileBuilderClass {
  async build(htmlSnippets: ArticleSnippet[]): Promise<unknown> {
    // --- Validate input
    if (htmlSnippets.length === 0) {
      throw new Error("No snippets passed");
    }

    // Validate all articles and throw error
    const validationErrors = await this.validateArticles(htmlSnippets);
    if (Object.entries(validationErrors).length > 0) {
      throw new Error(this.articleErrorToHumanReadable(validationErrors));
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
    const isHtmlValid = validationRes.valid || validationRes.errorCount <= 2;
    if (!isHtmlValid) validationErrors.add("INVALID_HTML");

    return validationErrors;
  }

  /**
   * Validate many articles at once.
   *
   * Handles joining errors
   */
  private async validateArticles(
    articles: ArticleSnippet[]
  ): Promise<ArticleUrlErrorsMap> {
    // @TODO: can we use many threads here?
    return articles.reduce(async (acc, article) => {
      const errorTypes = await this.validateArticle(article);
      if (errorTypes.size === 0) return acc;
      return {
        ...acc,
        [article.metadata.url]: errorTypes,
      };
    }, {});
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
