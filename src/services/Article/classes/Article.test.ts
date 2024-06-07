import { Article } from "@services/Article";
import { ArticleContentSelector } from "@services/Article/classes/Article";
import { ParsedArticle } from "@services/Article/types";
import { fetchHtml } from "@utils/fetchHtml";

const TIMEOUT = 1000 * 60;

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
const SEMANTIC_NEWS_URL =
  "https://portal.pti.org.pl/regionalne-podsumowanie-geek/";

const COMMON_TESTS_FOR_PARSED_ARTICLE: [
  string,
  (pa: ParsedArticle, ctx: Record<string, unknown>) => void
][] = [
  [
    "Should return non-empty html snippet",
    (parsedArticle) =>
      expect(parsedArticle.htmlSnippet.length).toBeGreaterThan(0),
  ],
  [
    "Returned snippet should be smaller than initial HTML",
    (parsedArticle, { rawHtml }) => {
      if (typeof rawHtml === "string") {
        return expect(rawHtml.length).toBeGreaterThan(
          parsedArticle.htmlSnippet.length
        );
      }
      throw new Error("rawHtml must be a string");
    },
  ],
  [
    "Returned snippet should contain non-empty title",
    (parsedArticle) =>
      expect(parsedArticle.metadata.title.length).toBeGreaterThan(0),
  ],
];

describe("Extracting article from HTML with Article class", () => {
  describe("Valid use", () => {
    describe("Using semantic API", () => {
      let parsedArticle: ParsedArticle | null = null;
      let rawHtml = "";

      beforeAll(async () => {
        const articleUrlHtmlMap = await fetchHtml([SEMANTIC_NEWS_URL]);
        const [[url, html]] = Object.entries(articleUrlHtmlMap);
        rawHtml = html;
        const article = new Article({ html, url });
        parsedArticle = await article.fromSemanticHtml();
      }, TIMEOUT);

      COMMON_TESTS_FOR_PARSED_ARTICLE.forEach(([name, fun]) =>
        test(name, () => fun(parsedArticle!, { rawHtml }))
      );
    });

    describe("Using selectors API", () => {
      let parsedArticle: ParsedArticle | null = null;
      let rawHtml = "";

      beforeAll(async () => {
        const articleUrlHtmlMap = await fetchHtml([
          EXAMPLE_NON_SEMANTIC_NEWS_URL,
        ]);
        const [[url, html]] = Object.entries(articleUrlHtmlMap);
        rawHtml = html;
        const article = new Article({ html, url });
        const selectors: ArticleContentSelector[] = [
          {
            name: "header",
            querySelector: ".wp-block-post-title",
          },
          {
            name: "content",
            querySelectorAll: ["p", "img", "h1", "h2", "h3", "h4", "h5"]
              .map((tag) => `.wp-block-post-content ${tag}`)
              .join(", "),
          },
        ];
        parsedArticle = await article.fromSelectors(selectors);
      }, TIMEOUT);

      COMMON_TESTS_FOR_PARSED_ARTICLE.forEach(([name, fun]) =>
        test(name, () => fun(parsedArticle!, { rawHtml }))
      );

      test("Snippet contains selected header element", () => {
        expect(
          parsedArticle!.htmlSnippet.includes(`class=".wp-block-post-title"`)
        );
      });
    });
  });
  describe("Invalid use", () => {
    describe("Using semantic API", () => {
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
      }, TIMEOUT);
    });

    describe("Using selectors API", () => {
      let article: Article | null = null;
      const selectors: ArticleContentSelector[] = [
        {
          querySelector: ".wp-block-post-bitle",
        },
        {
          name: "content",
          querySelectorAll: ["p", "img", "h1", "h2", "h3", "h4", "h5"]
            .map((tag) => `.wp-block-post-content ${tag}`)
            .join(", "),
        },
      ];

      beforeAll(async () => {
        const articleUrlHtmlMap = await fetchHtml([
          EXAMPLE_NON_SEMANTIC_NEWS_URL,
        ]);
        const [[url, html]] = Object.entries(articleUrlHtmlMap);
        article = new Article({ html, url });
      }, TIMEOUT);

      test("Trying to access non-existing element shows error", async () => {
        await expect(() => article!.fromSelectors(selectors)).rejects.toThrow(
          `${EXAMPLE_NON_SEMANTIC_NEWS_URL} -> [0]: Didn't find any elements matching query.`
        );
      });

      test("Trying to access non-existing element identified by name", async () => {
        const NAME = "header";
        selectors[0].name = NAME;
        await expect(() => article!.fromSelectors(selectors)).rejects.toThrow(
          `${EXAMPLE_NON_SEMANTIC_NEWS_URL} -> [${NAME}]: Didn't find any elements matching query.`
        );
        delete selectors[0].name;
      });
    });
  });
});
