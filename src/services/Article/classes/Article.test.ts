import { Article } from "@services/Article";
import { ParsedArticle } from "@services/Article/types";
import { fetchHtml } from "@utils/fetchHtml";

const EXAMPLE_BAD_HTML = `
<!DOCTYPE html>
<html>
<body>

<h1>My First Heading<h1>
<p>My first paragraph.

</body>
</html>
`;

const EXAMPLE_NON_SEMANTIC_NEWS_URL =
  "https://techcrunch.com/2024/05/11/teslas-profitable-supercharger-network-in-limbo-after-musk-axed-entire-team/";
const SEMANTIC_NEWS = "https://portal.pti.org.pl/regionalne-podsumowanie-geek/";

describe("Extracting article from HTML with Article class", () => {
  describe("Invalid use", () => {
    test("Invalid HTML passed", async () => {
      const article = new Article({
        html: EXAMPLE_BAD_HTML,
        url: "https://google.com",
      });
      await expect(() => article.fromSemanticHtml()).rejects.toThrow(
        /Invalid HTML snippet/
      );
    });
    test("Parsing non-semantic page as semantic", async () => {
      const articleUrlHtmlMap = await fetchHtml([
        EXAMPLE_NON_SEMANTIC_NEWS_URL,
      ]);
      const [[url, html]] = Object.entries(articleUrlHtmlMap);
      const article = new Article({ html, url });
      await expect(() => article.fromSemanticHtml()).rejects.toThrow(
        /No semantic <article> element found/
      );
    });
  });
  describe("Valid use", () => {
    describe("Parsing valid semantic page", () => {
      let parsedArticle: ParsedArticle | null = null;
      let rawHtml = "";
      beforeAll(async () => {
        const articleUrlHtmlMap = await fetchHtml([SEMANTIC_NEWS]);
        const [[url, html]] = Object.entries(articleUrlHtmlMap);
        rawHtml = html;
        const article = new Article({ html, url });
        parsedArticle = await article.fromSemanticHtml();
      });
      test("Should return non-empty html snippet", () => {
        expect(parsedArticle!.htmlSnippet.length).toBeGreaterThan(0);
      });
      test("Returned snippet should be smaller than initial HTML", () => {
        expect(rawHtml.length).toBeGreaterThan(
          parsedArticle!.htmlSnippet.length
        );
      });
      test("Returned snippet should contain non-empty title", () => {
        expect(parsedArticle!.metadata.title.length).toBeGreaterThan(0);
      });
    });
  });
});
