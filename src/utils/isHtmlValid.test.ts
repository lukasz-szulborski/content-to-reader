import { isHtmlValid } from "@utils/isHtmlValid";

describe(`isHtmlValid util function`, () => {
  describe("Invalid usage", () => {
    test("Pass non-html string", async () => {
      const res = await isHtmlValid("<hello 123");
      expect(res).toBe(false);
    });
  });
  describe("Valid usage", () => {
    test("Pass html string", async () => {
      const res = await isHtmlValid(`
      <html>
        <head>
          <title>Hello World</title>
        </head>
        <body>
          <h1>0-0-0</h1>
        </body>
      </html>
      `);
      expect(res).toBe(true);
    });
  });
});
