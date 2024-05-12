import { Article } from "@services/Article";

const EXAMPLE_BAD_HTML = `
<!DOCTYPE html>
<html>
<body>

<h1>My First Heading<h1>
<p>My first paragraph.

</body>
</html>
`;

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
  });
});
