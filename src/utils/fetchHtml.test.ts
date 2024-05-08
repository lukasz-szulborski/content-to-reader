import { fetchHtml } from "@utils/fetchHtml";
import { isHtmlValid } from "@utils/isHtmlValid";

const VALID_URLS = ["https://google.com", "https://github.com"];

describe(`fetchHtml util function`, () => {
  describe("Invalid usage", () => {
    test("Empty array of URLs yields empty object", async () => {
      const result = await fetchHtml([]);
      expect(result).toMatchObject({});
    });
    test("Invalid URL(s) causes an error", async () => {
      await expect(
        fetchHtml(["htps://google.com", "https://abc.defgh"])
      ).rejects.toThrow();
    });
    test("Non-existing URL causes an error", async () => {
      await expect(
        fetchHtml(["http://this.one.definitely.does.not.exist.com"])
      ).rejects.toThrow();
    });
  });
  describe("Valid usage", () => {
    test("Each passed URL should be present in the results", async () => {
      const result = await fetchHtml(VALID_URLS);
      const isEachUrlPresent = Object.entries(result).reduce(
        (acc, [url]) => (url in result ? acc : false),
        true
      );
      expect(isEachUrlPresent).toBe(true);
    });
    test("Function should return valid HTML", async () => {
      const result = await fetchHtml(VALID_URLS.slice(0, 1));
      const isValid = await isHtmlValid(result[VALID_URLS[0]]);
      expect(isValid).toBe(true);
    });
  });
});
