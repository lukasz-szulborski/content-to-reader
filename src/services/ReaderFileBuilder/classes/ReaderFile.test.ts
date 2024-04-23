import os from "node:os";
import fs from "node:fs/promises";
import { v4 as uuid } from "uuid";

import { ReaderFile } from "./ReaderFile";

describe("Managing binaries with ReaderFile", () => {
  test("Non-existing temporary file should cause an error", () => {
    const badPath = `${os.tmpdir()}/TEST_BAD_${uuid()}.epub`;
    expect(
      () =>
        new ReaderFile({
          format: "EPUB",
          temporaryPath: badPath,
        })
    ).toThrow(/Fatal/);
  });

  describe("Managing valid files", () => {
    const goodPath = `${os.tmpdir()}/TEST_GOOD_${uuid()}.epub`;
    beforeEach(async () => {
      await fs.writeFile(
        goodPath,
        "Ja mogę powiedzieć coś na ten temat, że po prostu, że ja na ten temat nic za bardzo nie mogę powiedzieć."
      );
    });

    test("Holding valid reference to a temporary file", () => {
      const instance = new ReaderFile({
        format: "EPUB",
        temporaryPath: goodPath,
      });
      expect(instance.temporaryPath).toEqual(goodPath);
    });

    test("Creating an instance with accessible and existing file", () => {
      expect(
        new ReaderFile({
          format: "EPUB",
          temporaryPath: goodPath,
        })
      ).toBeInstanceOf(ReaderFile);
    });

    test("Commiting temporary files", async () => {
      const destinationPath = `${os.tmpdir()}/DESTINATION_FILE_${uuid()}.epub`;

      const instance = new ReaderFile({
        format: "EPUB",
        temporaryPath: goodPath,
      });

      await instance.save(destinationPath);

      const savedFileExists = await (async () => {
        try {
          await fs.access(destinationPath);
          return true;
        } catch (error) {
          return false;
        }
      })();

      expect(savedFileExists).toBe(true);

      await fs.unlink(destinationPath);
    });

    test("Cleanup", async () => {
      const destinationPath = `${os.tmpdir()}/DESTINATION_FILE_${uuid()}.epub`;

      const instance = new ReaderFile({
        format: "EPUB",
        temporaryPath: goodPath,
      });

      await instance.save(destinationPath);

      // After commiting the file let's clean temporary files related to this `ReaderFile`
      await instance.cleanup();

      const tmpExists = await (async () => {
        try {
          await fs.access(goodPath);
          return true;
        } catch (error) {
          return false;
        }
      })();

      expect(tmpExists).toBe(false);

      await fs.unlink(destinationPath);
    });

    test("Cleanup should be idempotent", async () => {
      const instance = new ReaderFile({
        format: "EPUB",
        temporaryPath: goodPath,
      });

      await instance.cleanup();
      await instance.cleanup();

      const tmpExists = await (async () => {
        try {
          await fs.access(goodPath);
          return true;
        } catch (error) {
          return false;
        }
      })();

      expect(tmpExists).toBe(false);
    });

    describe("Cleanup should invalidate the instance", () => {
      test("Don't allow saving", async () => {
        const destinationPath = `${os.tmpdir()}/DESTINATION_FILE_${uuid()}.epub`;
        const instance = new ReaderFile({
          format: "EPUB",
          temporaryPath: goodPath,
        });

        await instance.cleanup();

        await expect(instance.save(destinationPath)).rejects.toThrow(/Fatal/);
      });
      test("Don't allow accessing temporary path", async () => {
        const instance = new ReaderFile({
          format: "EPUB",
          temporaryPath: goodPath,
        });

        await instance.cleanup();
        expect(() => instance.temporaryPath).toThrow(/Fatal/);
      });
    });

    afterEach(async () => {
      try {
        await fs.unlink(goodPath);
      } catch {}
    });
  });
});
