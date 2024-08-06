import { ConfigurationParser } from "@services/Configuration/classes/Configuration";
import { Configuration } from "@services/Configuration/types";

describe("Parsing configuration files with ConfigurationParser", () => {
  describe("Valid config file (valid_config.yaml)", () => {
    let config: Configuration | null = null;
    // @NOTE:  this test expects this config to look in a certain way. Don't modify it
    const configParser = new ConfigurationParser({
      path: "./src/services/Configuration/tests/valid_config.yaml",
    });
    beforeAll(async () => {
      config = await configParser.get();
    });

    test("has output path", () => {
      expect(
        "output" in config! && config!.output && config!.output.length > 0
      ).toBe(true);
    });

    test("has valid `toDevice`", () => {
      if (!("toDevice" in config!) || config!.toDevice === undefined)
        return expect(true).toBe(true);

      const { deviceEmail, senderEmail, senderPassword } = config!.toDevice;

      expect(
        deviceEmail.length > 0 &&
          senderEmail.length > 0 &&
          senderPassword.length > 0
      ).toBe(true);
    });

    test("2 first pages should be just url strings", () => {
      const pages = config!.pages;
      expect(
        typeof pages.at(0) === "string" && typeof pages.at(1) === "string"
      ).toBe(true);
    });

    describe("parsing page with selectors", () => {
      test("has valid url", () => {
        const page = config!.pages.at(3)!;
        if (typeof page === "string") return expect(false).toBe(true);

        expect(page.url === "https://ziglang.org/learn/overview/");
      });

      test("has 3 selectors", () => {
        const page = config!.pages.at(3)!;
        if (typeof page === "string") return expect(false).toBe(true);

        expect(page.selectors.length).toBe(3);
      });

      test("second selector has name 'Content'", () => {
        const page = config!.pages.at(3)!;
        if (typeof page === "string") return expect(false).toBe(true);

        expect(page.selectors.at(1)!.name).toBe("Content");
      });

      test("class names unfolding", () => {
        const page = config!.pages.at(3)!;
        if (typeof page === "string") return expect(false).toBe(true);

        const selector = page.selectors.at(1)!;

        if (!("all" in selector)) return expect(false).toBe(true);

        expect(selector.all).toBe(
          ".page-content .contents h1, .page-content .contents h2, .page-content .contents h3, .page-content .contents h4, .page-content .contents h5, .page-content .contents p, .page-content .contents code, .page-content .contents .custom-tip p, .page-content .contents .custom-tip div, .page-content .contents .custom-tip .some-class a, .page-content .contents .custom-tip .some-class p"
        );
      });

      test("selector without a name is still valid", () => {
        const page = config!.pages.at(3)!;
        if (typeof page === "string") return expect(false).toBe(true);

        const selector = page.selectors.at(2)!;

        expect("name" in selector).toBe(false);
      });
    });
  });

  describe("Valid simpler config file (valid_config_2.yaml)", () => {
    let config: Configuration | null = null;
    // @NOTE:  this test expects this config to look in a certain way. Don't modify it
    const configParser = new ConfigurationParser({
      path: "./src/services/Configuration/tests/valid_config_2.yaml",
    });
    beforeAll(async () => {
      config = await configParser.get();
    });

    test("selector from code comment", () => {
      const page = config!.pages.at(1)!;
      if (typeof page === "string") return expect(false).toBe(true);

      const selector = page.selectors.at(1)!;

      if (!("first" in selector)) return expect(false).toBe(true);

      expect(selector.first).toBe(
        ".page-content .contents h1, .page-content .contents h2"
      );
    });
  });

  describe("Invalid config file should cause an error", () => {
    test("partial `toDevice`", async () => {
      const configParser = new ConfigurationParser({
        path: "./src/services/Configuration/tests/invalid_config_1.yaml",
      });
      await expect(() => configParser.get()).rejects.toThrow(/toDevice/);
    });

    test("invalid page", async () => {
      const configParser = new ConfigurationParser({
        path: "./src/services/Configuration/tests/invalid_config_2.yaml",
      });
      await expect(() => configParser.get()).rejects.toThrow(/pages/);
    });

    test("no `all` and `first`", async () => {
      const configParser = new ConfigurationParser({
        path: "./src/services/Configuration/tests/invalid_config_3.yaml",
      });
      await expect(() => configParser.get()).rejects.toThrow(
        /If you define selector then `first` or `all` must be set/
      );
    });

    test("selector can't have both `all` and `first`", async () => {
      const configParser = new ConfigurationParser({
        path: "./src/services/Configuration/tests/invalid_config_4.yaml",
      });
      await expect(() => configParser.get()).rejects.toThrow(
        /You can't have both `first` and `all`/
      );
    });

    test("invalid selector structure", async () => {
      const configParser = new ConfigurationParser({
        path: "./src/services/Configuration/tests/invalid_config_5.yaml",
      });
      await expect(() => configParser.get()).rejects.toThrow(
        /pages -> 0 -> selectors -> 1/
      );
    });

    test("configuration must provide either 'output' or 'toDevice' parameter", async () => {
      const configParser = new ConfigurationParser({
        path: "./src/services/Configuration/tests/invalid_config_6.yaml",
      });
      await expect(() => configParser.get()).rejects.toThrow(
        /You must provide either 'output' or 'toDevice' paramter in your configuration./
      );
    });
  });
});
