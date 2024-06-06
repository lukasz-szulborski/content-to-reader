import { JSDOM } from "jsdom";
import { ParsedArticle, ParsedArticleMetadata } from "@services/Article/types";
import { isHtmlValid } from "@utils/isHtmlValid";

export type ArticleContentSelector = {
  name?: string;
} & ({ querySelectorAll: string } | { querySelector: string });

interface ArticleLike {
  /**
   * Finds `<article>` element in a given HTML.
   */
  fromSemanticHtml(): Promise<ParsedArticle>;
  /**
   * Creates `ParsedArticle` by concatenating elements found using selectors.
   *
   * Resulting HTML structure will be flat (no nesting of different selectors).
   */
  fromSelectors(selectors: ArticleContentSelector[]): Promise<ParsedArticle>;
}

interface ArticleLikeConstructor {
  /**
   * URL to article
   */
  url: string;
  /**
   * Article HTML
   */
  html: string;
}

/**
 * Extracts only the article contents from the whole HTML page.
 *
 * Currently works only for semantic HTML.
 * `<article>` element should contain the article.
 *
 *  @TODO
 * * **[In the future]** This class should allow more sophisticated methods of extracting article elements from HTML (besides the semantic html). It could allow selecting only vital article elements from the webpage.
 */
export class Article implements ArticleLike {
  private _htmlSnippet: JSDOM;
  private _rawHtmlSnippet: string;
  private _url: string;
  private _metadata: ParsedArticleMetadata;

  constructor({ url, html }: ArticleLikeConstructor) {
    if (html.length === 0)
      throw new Error("You can't build Article off of empty HTML snippet.");
    this._htmlSnippet = new JSDOM(html);
    this._rawHtmlSnippet = html;
    this._url = url;
    this._metadata = this.getArticleMetadata();
  }

  async fromSemanticHtml(): Promise<ParsedArticle> {
    await this.validateHtmlSnippet();
    const articleElement =
      this._htmlSnippet.window.document.querySelector("article");
    if (articleElement === null) {
      throw new Error(`${this._url}: No semantic <article> element found.`);
    }
    return {
      htmlSnippet: articleElement.outerHTML,
      metadata: this._metadata,
    };
  }

  async fromSelectors(
    selectors: ArticleContentSelector[]
  ): Promise<ParsedArticle> {
    await this.validateHtmlSnippet();
    const JOIN_TOKEN = "<br>\n";
    const htmlDocument = this._htmlSnippet.window.document;
    const snippets = selectors.map((selector, i) => {
      const isQuerySelector = "querySelector" in selector;
      const queryResults = isQuerySelector
        ? htmlDocument.querySelector(selector.querySelector)
        : htmlDocument.querySelectorAll(selector.querySelectorAll);
      if (queryResults === null) {
        throw new Error(
          `${this._url} -> [${
            selector.name ?? i
          }]: Didn't find any elements matching query.`
        );
      }
      return "innerHTML" in queryResults
        ? queryResults.outerHTML
        : Array.from(queryResults)
            .map((elem) => elem.outerHTML)
            .join(JOIN_TOKEN);
    });
    const concatenatedSnippet = `<html>${snippets.join(JOIN_TOKEN)}</html>`;
    return {
      htmlSnippet: concatenatedSnippet,
      metadata: this._metadata,
    };
  }

  private getArticleMetadata(): ParsedArticleMetadata {
    return {
      title: this._htmlSnippet.window.document.title,
      url: this._url,
    };
  }

  private async validateHtmlSnippet(): Promise<void> {
    const isValid = await isHtmlValid(this._rawHtmlSnippet);
    if (!isValid) {
      throw new Error(`${this._url}: Invalid HTML snippet`);
    }
  }
}