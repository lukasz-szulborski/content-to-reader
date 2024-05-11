import { JSDOM } from "jsdom";
import { ParsedArticle, ParsedArticleMetadata } from "@services/Article/types";

interface ArticleClass {
  /**
   * Finds `<article>` element in a given HTML.
   */
  fromSemanticHtml(): ParsedArticle;
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
export class Article implements ArticleClass {
  private _htmlSnippet: JSDOM;
  private _url: string;

  constructor(url: string, html: string) {
    if (html.length === 0)
      throw new Error("You can't build Article off of empty HTML snippet.");
    this._htmlSnippet = new JSDOM(html);
    this._url = url;
  }

  fromSemanticHtml(): ParsedArticle {
    return {
      htmlSnippet: "",
      metadata: this.getArticleMetadata(),
    };
  }

  private getArticleMetadata(): ParsedArticleMetadata {
    return {
      title: this._htmlSnippet.window.document.title,
      url: this._url,
    };
  }
}
