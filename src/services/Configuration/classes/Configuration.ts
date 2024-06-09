import path from "path";
import fs from "fs/promises";

import yaml from "js-yaml";

interface Configuration {}

interface ConfigurationParserLike {
  /**
   * Parse configuration file and return `Configuration`
   */
  get(): Promise<Configuration>;
}

interface ConfigurationParserLikeConstructor {
  /**
   * Path to configuration file
   */
  path: string;
}

/**
 * Extract configuration from configuration file.
 *
 * Configuration returned by this class is used to determine from where
 * and how the program builds epub.
 */
export class ConfigurationParser implements ConfigurationParserLike {
  private _configFilePath: string;
  private _extension: "yaml";

  constructor({ path: _path }: ConfigurationParserLikeConstructor) {
    this._configFilePath = _path;
    const extension = path.extname(this._configFilePath);
    if (extension !== "yaml") {
      throw new Error("Unsupported configuration file type");
    }
    this._extension = extension;
  }

  async get(): Promise<Configuration> {
    const fileContent = await fs.readFile(this._configFilePath, {
      encoding: "utf8",
    });
    switch (this._extension) {
      case "yaml":
        return this.parseYamlConfig(fileContent);
      default:
        throw new Error("Unsupported configuration file type");
    }
  }

  private async parseYamlConfig(content: string): Promise<Configuration> {
    const result = yaml.load(content, {
      filename: this._configFilePath,
    }) as null | unknown | string | number | Record<string, unknown>;
    if (!result || typeof result === "string" || typeof result === "number") {
      throw new Error(
        `${this._configFilePath}: Invalid configuration file. Please refer to documentation`
      );
    }

    this.validateParsedObject(result as Record<string, unknown>);

    return {};
  }

  private validateParsedObject(object: Record<string, unknown>): void {
    // @TODO: zod
  }
}
