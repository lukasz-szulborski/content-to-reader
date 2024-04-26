import { ReaderFileBuilder } from "./ReaderFileBuilder";
import { ArticleSnippet } from "@services/ReaderFileBuilder/types";

const EXAMPLE_GOOD_HTML = `
<!DOCTYPE html>
<html>
<body>

<h1>My First Heading</h1>
<p>My first paragraph.</p>

</body>
</html>
`;

const EXAMPLE_BAD_HTML = `
<!DOCTYPE html>
<html>
<body>

<h1>My First Heading</h1>
<p>My first paragraph.

</body>
</html>
`;

const MOCK_CORRECT_ARTICLE: ArticleSnippet = {
  htmlSnippet: EXAMPLE_GOOD_HTML,
  metadata: {
    title:
      "Biden signs bill that would ban TikTok if ByteDance fails to sell the app",
    url: "https://techcrunch.com/2024/04/24/biden-signs-bill-that-would-ban-tiktok-if-bytedance-fails-to-sell-the-app/",
    keywords: ["TikTok", "US", "Ban"],
  },
};

const readerFileBuilder = new ReaderFileBuilder();

describe(`ReaderFileBuilder.build method`, () => {
  describe("Test validation", () => {
    test("When no articles", async () => {
      await expect(() => readerFileBuilder.build([])).rejects.toThrow(
        /No snippets/
      );
    });
    test("When an article with an empty title", async () => {
      // I like JS, but those shallow copies...
      const article = {
        ...MOCK_CORRECT_ARTICLE,
        metadata: { ...MOCK_CORRECT_ARTICLE.metadata },
      };
      article.metadata.title = "";
      await expect(() => readerFileBuilder.build([article])).rejects.toThrow(
        /EMPTY_TITLE/
      );
    });
    test("When an article with a bad HTML", async () => {
      const article = { ...MOCK_CORRECT_ARTICLE };
      article.htmlSnippet = EXAMPLE_BAD_HTML;
      await expect(() => readerFileBuilder.build([article])).rejects.toThrow(
        /INVALID_HTML/
      );
    });
  });

  describe("Test rollback and cleanup", () => {
    test("/tmp directory should be removed on return", async () => {
      // @TODO: ...
    });
  });
});
