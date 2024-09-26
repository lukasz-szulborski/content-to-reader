import { fetchHtml } from "@utils/fetchHtml";

const VALID_URLS = ["https://google.com", "https://github.com"];
const TIMEOUT = 1000 * 60;

describe(`fetchHtml util function`, () => {
  describe("Invalid usage", () => {
    test(
      "Empty array of URLs yields empty object",
      async () => {
        const result = await fetchHtml([]);
        expect(result).toMatchObject({});
      },
      TIMEOUT
    );
    test(
      "Invalid URL(s) causes an error",
      async () => {
        await expect(
          fetchHtml(["htps://google.com", "https://abc.defgh"])
        ).rejects.toThrow();
      },
      TIMEOUT
    );
    test(
      "Non-existing URL causes an error",
      async () => {
        await expect(
          fetchHtml(["http://this.one.definitely.does.not.exist.com"])
        ).rejects.toThrow();
      },
      TIMEOUT
    );
  });
  describe("Valid usage", () => {
    test(
      "Each passed URL should be present in the results",
      async () => {
        const result = await fetchHtml(VALID_URLS);
        const isEachUrlPresent = Object.entries(result).reduce(
          (acc, [url]) => (url in result ? acc : false),
          true
        );
        expect(isEachUrlPresent).toBe(true);
      },
      TIMEOUT
    );
    test(
      "Results should include valid intial order of URLs",
      async () => {
        const result = await fetchHtml(VALID_URLS);
        const matchesOrder = Object.entries(result).reduce(
          (acc, [url, result]) => VALID_URLS[result.order] === url && acc,
          true
        );
        expect(matchesOrder).toBe(true);
      },
      TIMEOUT
    );
  });
});
