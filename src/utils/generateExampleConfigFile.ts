import asyncFs from "node:fs/promises";
import { parse } from "path";

import { EXAMPLE_CONFIG } from "@const/exampleConfig";

/**
 * Saves exemplary YAML configuration file in a given location.
 *
 * @returns sanitized destination path
 */
export const generateExampleConfigFile = async (
  path: string
): Promise<string> => {
  const { ext, dir, name } = parse(path);
  const destinationPath = ext !== ".yaml" ? `${dir}/${name}.yaml` : path;
  await asyncFs.writeFile(destinationPath, EXAMPLE_CONFIG);
  return destinationPath;
};
