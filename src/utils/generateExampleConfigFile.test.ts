import asyncFs from "node:fs/promises";
import path from "path";

import { EXAMPLE_CONFIG } from "@const/exampleConfig";
import { generateExampleConfigFile } from "@utils/generateExampleConfigFile";

const GOOD_PATH = "./example_config.yaml";
// Not exactly bad but the one that needs sanitization
const BAD_PATH_1 = "./example_config";
const BAD_PATH_2 = "./example_config.exe";

describe(`generateExampleConfigFile util function`, () => {
  describe("Should produce valid YAML file", () => {
    let savedFilePath = "";

    test("Compare contents of template and final file", async () => {
      savedFilePath = await generateExampleConfigFile(GOOD_PATH);
      const fileContent = await asyncFs.readFile(savedFilePath, {
        encoding: "utf8",
      });

      expect(fileContent).toBe(EXAMPLE_CONFIG);
    });

    afterEach(async () => {
      await asyncFs.rm(savedFilePath);
    });
  });

  describe("Should produce files only in a YAML format", () => {
    let savedFilePath = "";

    test("If no extension .yaml should be appended", async () => {
      savedFilePath = await generateExampleConfigFile(BAD_PATH_1);
      console.log({ savedFilePath });
      expect(path.extname(savedFilePath)).toBe(".yaml");
    });

    test("If different extension .yaml should be appended", async () => {
      savedFilePath = await generateExampleConfigFile(BAD_PATH_2);
      expect(path.extname(savedFilePath)).toBe(".yaml");
    });

    afterEach(async () => {
      await asyncFs.rm(savedFilePath);
    });
  });
});
