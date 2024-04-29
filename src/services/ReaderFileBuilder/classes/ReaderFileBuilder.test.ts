import fs from "fs/promises";
import path from "path";

import { ReaderFileBuilder } from "@services/ReaderFileBuilder";
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

<h1>My First Heading<h1>
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

  describe("Test valid build run", () => {
    test("Output filename has today's date in it", async () => {
      const book = await readerFileBuilder.build([MOCK_CORRECT_ARTICLE]);
      const { temporaryPath, cleanup } = book;
      const padDateMonth = (n: number) => n.toString().padStart(2, "0");
      const now = new Date();
      const expectedStringDate = `${now.getFullYear()}-${padDateMonth(
        now.getMonth() + 1
      )}-${padDateMonth(now.getDate())}`;
      expect(temporaryPath.includes(expectedStringDate)).toBe(true);
      await cleanup();
    });
    test("Output file isn't empty", async () => {
      const book = await readerFileBuilder.build([MOCK_CORRECT_ARTICLE]);
      const { temporaryPath, cleanup } = book;
      const bookFileStats = await fs.stat(temporaryPath);
      expect(bookFileStats.size).toBeGreaterThan(0);
      await cleanup();
    });
    test("Output file has EPUB extension", async () => {
      const book = await readerFileBuilder.build([MOCK_CORRECT_ARTICLE]);
      const { temporaryPath, cleanup } = book;
      const extension = path.extname(temporaryPath).toLowerCase();
      expect(extension).toBe(".epub");
      await cleanup();
    });
    test("Output file is a valid EPUB file", () => {}); // @TODO: Can this be done?
  });
});
