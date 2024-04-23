import { accessSync, constants } from "node:fs";
import asyncFs from "node:fs/promises";

import { FileReaderBinaryFormat } from "@types";

interface ReaderFileConstructor {
  /**
   * Path where temporary file lives
   */
  readonly temporaryPath: string;
  /**
   * Format of the binary
   */
  readonly format: FileReaderBinaryFormat;
}

interface ReaderFileMethods {
  /**
   * Creates a safe copy of the file in a given location. Put differently, commits the temporary file.
   *
   * @returns Buffer of the saved file
   */
  save(destination: string): Promise<Buffer>;
  /**
   * Removes all temporary files related to this `ReaderFile` so they aren't left hanging forever.
   *
   * Unfortunately JavaScript doesn't implement any notion of a destructor/finalizer
   * (GC takes care of wiping this instance), therefore this function must be called explicitly
   * when this file is no longer in use.
   */
  cleanup(): Promise<void>;
}

type ReaderFileClass = ReaderFileConstructor & ReaderFileMethods;

/**
 * An object representing EPUB saved in a temporary location. It contains a path to that emphemeral file.
 *
 * It also allows saving related EPUB to safe non-temporary directory.
 *
 * **After you're done with specific reader file, call `cleanup()` function to clean binaries from `/tmp`.**
 * */
export class ReaderFile implements ReaderFileClass {
  private readonly _temporaryPath: string;
  private readonly _format: FileReaderBinaryFormat;
  // This field is mutable as it doesn't make sense to create a new `ReaderFile` that represents non-existing file. Conceptually `ReaderFile` always represents some existing uncommited ebook.
  private _didCleanup: boolean = false;

  constructor({ format, temporaryPath }: ReaderFileConstructor) {
    // Constructor assigns properties and check whether passed
    // file path is valid and accessible.
    const fileAccessible = this.isTmpAccessibleSync(temporaryPath);
    if (!fileAccessible)
      throw new Error(
        `Fatal error. Node cannot access file at ${temporaryPath}. Try promoting Node's OS permissions (RWX).`
      );

    this._temporaryPath = temporaryPath;
    this._format = format;
  }

  async save(destination: string): Promise<Buffer> {
    this.checkCleanup();
    await asyncFs.copyFile(
      this._temporaryPath,
      destination,
      asyncFs.constants.COPYFILE_EXCL
    );
    const newFile = await asyncFs.readFile(destination);
    return newFile;
  }

  async cleanup(): Promise<void> {
    try {
      await asyncFs.unlink(this._temporaryPath);
      this._didCleanup = true;
    } catch {}
  }

  get temporaryPath() {
    this.checkCleanup();
    return this._temporaryPath;
  }

  get format() {
    return this._format;
  }

  /**
   * Check if temporary path exists and is accessible for reading.
   *
   * I used synchronous API for the simplicity here. I want to instantiate and verify in a single step.
   */
  private isTmpAccessibleSync(path: string) {
    try {
      const result = accessSync(path, constants.R_OK);
      return result === undefined;
    } catch (error) {
      return false;
    }
  }

  /**
   * Method that verifies the state of this instance.
   *
   * We shouldn't allow any operations on this instance if `cleanup()` was called on it.
   */
  private checkCleanup(): boolean {
    if (!this._didCleanup) return true;

    throw new Error(
      `Fatal error. File at ${this._temporaryPath} doesn't exist anymore. \`clean()\` was called on this instance.`
    );
  }
}
