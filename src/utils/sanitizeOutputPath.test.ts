import { sanitizeOutputPath } from "@utils/sanitizeOutputPath";

import { ConfigurationError } from "@errors/ConfigurationError";

describe(`sanitizeOutputPath util function`, () => {
  describe("Invalid usage", () => {
    test("Passed filename with extension other than `.epub`", () => {
      expect(() => sanitizeOutputPath("filename.exe")).toThrow(
        ConfigurationError
      );
    });
  });
  describe("Valid usage", () => {
    test("Passed filename without extension and it appended '.epub'", async () => {
      const result = sanitizeOutputPath("filename");
      expect(result).toBe("filename.epub");
    });

    test("Extension should be case insensitive (eg. '.EPUB' == '.epub')", async () => {
      const result = sanitizeOutputPath("filename.EPub");
      expect(result).toBe("filename.epub");
    });

    test("Passed filename with '.epub' extension and it changed nothing", async () => {
      const result = sanitizeOutputPath("filename.epub");
      expect(result).toBe("filename.epub");
    });

    test("Passed path with filename without extension and it appended '.epub'", async () => {
      const result = sanitizeOutputPath("~/Documents/filename");
      expect(result).toBe("~/Documents/filename.epub");
    });

    test("Passed path with filename with '.epub' and it changed nothing", async () => {
      const result = sanitizeOutputPath("~/Documents/filename.epub");
      expect(result).toBe("~/Documents/filename.epub");
    });
  });
});
