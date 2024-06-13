import path from "path";
import fs from "fs/promises";

import yaml from "js-yaml";
import { ZodError, z } from "zod";

import {
  Configuration,
  ParsedConfigurationNonPrimitives,
  SectionSelector,
} from "@services/Configuration/types";
import { configValidationErrorToHumanReadable } from "@utils/zodErrorToHumanReadable";

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
 *
 * @TODO
 * - **[In the future]** Add support for json
 * - **[In the future]** Add support for custom DSL
 */
export class ConfigurationParser implements ConfigurationParserLike {
  private _configFilePath: string;
  private _extension: ".yaml";

  constructor({ path: _path }: ConfigurationParserLikeConstructor) {
    this._configFilePath = _path;
    const extension = path.extname(this._configFilePath);
    if (extension !== ".yaml") {
      throw new Error("Unsupported configuration file type");
    }
    this._extension = extension;
  }

  async get(): Promise<Configuration> {
    const fileContent = await fs.readFile(this._configFilePath, {
      encoding: "utf8",
    });
    switch (this._extension) {
      case ".yaml":
        return await this.parseYamlConfig(fileContent);
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

    return this.interpretConfigurationObject(
      result as ParsedConfigurationNonPrimitives
    );
  }

  /**
   * Validate parsed configuration and further interpret it.
   *
   * One of the steps is to generate nested selectors from `selectors` key:
   * @example
   * ```js
   * // This object snippet...
   * ...
   *    all: {
   *       ".page-content .contents" : ["h1", "h2"]
   *    }
   * ...
   * // ... should result in
   * ".page-content .contents h1, .page-content .contents h2"
   * ```
   * This comes in handy when you need to select multiple elements from certain parent element.
   */
  private interpretConfigurationObject(
    object: ParsedConfigurationNonPrimitives
  ): Configuration {
    const { output, pages, toDevice } = this.validateParsedObject(object);

    const _combineIntoString = (
      selector: SectionSelector,
      separator: string | undefined = ","
    ): string => {
      const aux = (
        parentClassName: string,
        selector: SectionSelector
      ): string => {
        if (typeof selector === "string")
          return `${parentClassName} ${selector}`;

        const entries = Object.entries(selector);
        if (entries.length === 0) return parentClassName;

        return entries
          .map(([className, selectors]) =>
            selectors
              .map((selector) =>
                aux(`${parentClassName} ${className}`, selector)
              )
              .join(separator)
          )
          .join(separator);
      };

      return aux("", selector).trim();
    };

    // Map pages config to something understandable by the internals
    const unfoldedPages = pages.map((page) => {
      if (typeof page === "string") return page;

      // If provided url, but forgot about selectors then treat like string
      if (!("selectors" in page) || page.selectors === undefined)
        return page.url;

      return {
        url: page.url,
        selectors: page.selectors.map((selector) =>
          Object.assign(
            selector,
            "first" in selector
              ? { first: _combineIntoString(selector.first) }
              : { all: _combineIntoString(selector.all) }
          )
        ),
      };
    });

    return {
      output,
      toDevice,
      pages: unfoldedPages,
    };
  }

  /**
   * Validate result of parsing configuration file.
   */
  private validateParsedObject(object: ParsedConfigurationNonPrimitives) {
    const selectorSchema: z.ZodType<SectionSelector> = z.union([
      z.string().min(1),
      z.record(z.array(z.lazy(() => selectorSchema))),
    ]);
    const configurationSchema = z.object({
      output: z.string().min(1),
      toDevice: z
        .object({
          deviceEmail: z.string().email(),
          senderEmail: z.string().email(),
          senderPassword: z.string().min(1),
        })
        .optional(),
      pages: z
        .array(
          z.union([
            z.string().min(1),
            z.object({
              url: z.string().min(1),
              selectors: z.array(
                z.intersection(
                  z.object({ name: z.string().min(1).optional() }),
                  z.union([
                    z.object({ first: selectorSchema }),
                    z.object({ all: selectorSchema }),
                  ])
                )
              ),
            }),
          ])
        )
        .nonempty()
        .min(1),
    });
    try {
      return configurationSchema.parse(object);
    } catch (error) {
      throw new Error(configValidationErrorToHumanReadable(error as ZodError));
    }
  }
}
