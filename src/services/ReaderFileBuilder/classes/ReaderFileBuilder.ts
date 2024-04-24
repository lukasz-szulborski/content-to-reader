import { JSDOM } from "jsdom";

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

type ReaderFileBuilderClass = ReaderFileBuilderMethods;

/**
 * An object that takes HTML snippets that represent various articles.
 *
 * It merges those snippets into nice and tidy EPUB file (ReaderFile). In the future it will allow different formats.
 *
 * @TODO: In the future, besides mapping HTML to epub, it will also control how the output EPUB looks like.
 *
 * For implementation details refer to specific functions' descriptions.
 */
export class ReaderFileBuilder implements ReaderFileBuilderClass {
  async build(htmlSnippets: ArticleSnippet[]): Promise<unknown> {
    // Validate input
    if (htmlSnippets.length === 0) throw new Error("No snippets passed");

    // ...
    return;
  }

  /**
   * Validate whether given article meets ceratin set of rules.
   *
   * @returns set of all errors found during validation
   */
  private validateArticle(article: ArticleSnippet) {
    const validationErrors: Set<ArticleSnippetStaticValidationResultType> =
      new Set();
    // Validate article's title
    if (!article.metadata.title || article.metadata.title.length === 0)
      validationErrors.add("EMPTY_TITLE");

    // Validate HTML
    try {
      new JSDOM(article.htmlSnippet);
    } catch (error) {
      validationErrors.add("INVALID_HTML");
    }

    return validationErrors;
  }
}
