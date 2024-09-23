import path from "path";

import { ConfigurationError } from "@errors/ConfigurationError";

/**
 * This function sanitizes output path/filename provided by user.
 *
 * Enforce certain rules on what `output` is accepted.
 */
export const sanitizeOutputPath = (
  output: string,
  defaultExtension = ".epub"
): string => {
  try {
    const { ext, name, dir } = path.parse(output);
    const extLowerCased = ext.toLowerCase();

    const hasExtension = ext.length > 0;

    if (hasExtension && extLowerCased !== ".epub")
      throw new ConfigurationError(
        "Only `.epub` extension is accepted. Check your 'output' path."
      );

    const finalFilename = hasExtension
      ? `${name}${extLowerCased}`
      : `${name}${defaultExtension}`;

    return path.join(dir, finalFilename);
  } catch (error: any) {
    if (error instanceof ConfigurationError) throw error;
    throw new ConfigurationError(error);
  }
};
