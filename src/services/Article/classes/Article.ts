import { JSDOM, VirtualConsole } from "jsdom";
import { extractFromHtml } from "@extractus/article-extractor";

import { ParsedArticle, ParsedArticleMetadata } from "@services/Article/types";

export type ArticleContentSelector = {
  name?: string;
} & ({ querySelectorAll: string } | { querySelector: string });

interface ArticleLike {
  /**
   * Finds `<article>` element or uses content-to-HTML ratio heristics to find an article in a given HTML.
   */
  fromHtml(): Promise<ParsedArticle>;
  /**
   * Creates `ParsedArticle` by concatenating elements found using selectors.
   *
   * Resulting HTML structure will be flat (no nesting of different selectors).
   */
  fromSelectors(selectors: ArticleContentSelector[]): ParsedArticle;
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
 * Extracts selected article contents from the whole HTML page.
 */
export class Article implements ArticleLike {
  private _htmlSnippet: JSDOM;
  private _rawHtmlSnippet: string;
  private _url: string;
  private _metadata: ParsedArticleMetadata;

  constructor({ url, html }: ArticleLikeConstructor) {
    if (html.length === 0)
      throw new Error("You can't build Article off of empty HTML snippet.");
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("error", () => {});
    this._htmlSnippet = new JSDOM(html, { virtualConsole });
    this._rawHtmlSnippet = html;
    this._url = url;
    this._metadata = this.getArticleMetadata();
  }

  async fromHtml(): Promise<ParsedArticle> {
    const articleElement =
      this._htmlSnippet.window.document.querySelector("article");
    const foundSemanticHtml = articleElement !== null;

    // Content-to-html ratio algorithm for article extraction in non-semantic html
    // Theoritical details of such an algo. are outlined here: doi 10.1145/2009916.2009952
    const contentExtractionResult = await (async () => {
      if (foundSemanticHtml) return null; // Short-circuit to avoid unnecessary computation

      try {
        return articleElement === null
          ? (await extractFromHtml(this._rawHtmlSnippet, this._url))?.content
          : null;
      } catch {
        return null;
      }
    })();

    const foundNonSemanticContent = !!contentExtractionResult;

    if (!foundSemanticHtml && !foundNonSemanticContent) {
      throw new Error(
        `<article> element not found nor could extract content. Please try using selectors API.`
      );
    }

    const htmlSnippet = foundSemanticHtml
      ? articleElement.outerHTML
      : contentExtractionResult!;

    // Manipulate final HTML so it renders well
    const snippetJsDom = new JSDOM(htmlSnippet).window.document;
    // Remove style snippets so readers can decide how things look
    // What's more, when `style` tags are present, Amazon doesn't accept the file. Probably some of the CSS rules are not approved by their filters.
    snippetJsDom.querySelectorAll("style").forEach((style) => style.remove());
    // SVGs cause random page breaks and other formatting issues
    // "SVG tags can lead to errors. We recommend removing SVG tags and using the image tag in HTML for images" ~ https://kdp.amazon.com/en_US/help/topic/G75V4YX5X8GRGXWV
    snippetJsDom.querySelectorAll("svg").forEach((s) => s.remove());

    return {
      htmlSnippet: snippetJsDom.documentElement.outerHTML,
      metadata: this._metadata,
    };
  }

  fromSelectors(selectors: ArticleContentSelector[]): ParsedArticle {
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
      return "outerHTML" in queryResults
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
}
