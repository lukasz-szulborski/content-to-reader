#!/usr/bin/env node

/**
 * content-to-reader
 * Author: Łukasz Szulborski, 2024
 * License: https://github.com/lukasz-szulborski/content-to-reader/blob/main/LICENSE.md
 */

import { Command } from "commander";
//@ts-ignore
import { SMTPChannel } from "smtp-channel"; // Deals with maintaining TCP sockets nicely
import { v4 as uuid } from "uuid";

import { ConfigurationParser } from "@services/Configuration";
import { Article } from "@services/Article";
import { ReaderFileBuilder } from "@services/ReaderFileBuilder";
import { fetchHtml } from "@utils/fetchHtml";
import { CommitReaderFileError } from "@errors/CommitReaderFileError";
// import { PageConfigSelector } from "@services/Configuration/types";
import { ParsedArticle } from "@services/Article/types";

process.removeAllListeners("warning");

const program = new Command();

program
  .name("content-to-reader")
  .description("CLI utility for creating EPUBs from WWW pages.")
  .version("0.0.2");

program
  .command("create")
  .description("Create EPUB from a single URL or pass a configuration file.")
  .argument("[string]", "Website URL")
  .option(
    "-o, --output [string]",
    "output location",
    `./content-to-reader-${new Date().getTime()}.epub`
  )
  .option("-c, --config [string]", "config file path")
  .action(async (url: string | undefined, options) => {
    const chalk = (await import("chalk")).default;
    console.log(`${chalk.blue.bold("Started...")}`);
    const fromUrl = url !== undefined && url.length > 0;

    const config = await (async () => {
      if (!options.config) return null;
      console.log(`${chalk.blue.bold("Parsing config...")}`);
      try {
        const parser = new ConfigurationParser({
          path: options.config,
        });
        return parser.get();
      } catch {
        return null;
      }
    })();

    const outputPath: string | undefined = config
      ? config.output
      : options.output;

    if (
      outputPath === undefined &&
      (config === null || config.toDevice === undefined)
    ) {
      console.log(
        chalk.bold.red(
          "Couldn't determine output path. Use either -o option or a configuration file."
        )
      );
      return;
    }

    // Check if no URLs provided
    if (fromUrl === false && (config === null || config.pages.length === 0)) {
      console.log(
        chalk.bold.red(
          "No pages provided. Use configuration file or pass a single URL as the first argument."
        )
      );
      return;
    }

    // Fetch HTML
    console.log(`${chalk.blue.bold("Fetching pages...")}`);
    const fetched = await fetchHtml(
      config
        ? config.pages.map((page) =>
            typeof page === "string" ? page : page.url
          )
        : [url!],
      (url) => console.log(`${chalk.blue.bold("Fetched")} ${url}`)
    );

    // Save selector configuration for each URL
    // It will help when we'll extract content from each article 
    // const urlSelectorsMap: Record<string, PageConfigSelector[] | null> | null =
    //   config
    //     ? config.pages.reduce(
    //         (acc, page) =>
    //           typeof page === "string"
    //             ? Object.assign(acc, { [page]: null })
    //             : Object.assign(acc, { [page.url]: page.selectors }),
    //         {}
    //       )
    //     : null;

    console.log(`${chalk.blue.bold("Parsing pages...")}`);
    const parseArticlesJob = Object.entries(fetched).map(
      async ([url, { html, order }]) => {
        const article = new Article({ html, url });

        if (!config) return { result: await article.fromHtml(), order };

        // Find config related to this URL and get selectors
        // @TODO: why do I need to find each time? this is O(n^2)
        const pageConfig = config.pages.find(
          (page) =>
            typeof page !== "string" &&
            page.url === url &&
            page.selectors.length > 0
        );
        const configSelectors =
          pageConfig && typeof pageConfig !== "string"
            ? pageConfig.selectors
            : null;

        // Map config selectors so they can be understood by parser
        //  @TODO: why do I need that? `ArticleContentSelector` should resemble user-facing config to avoid ambiguity.
        const selectors = configSelectors
          ? configSelectors.map((s) => {
              return Object.assign(
                { name: s.name },
                "first" in s
                  ? { querySelector: s.first }
                  : { querySelectorAll: s.all }
              );
            })
          : null;

        const result = selectors
          ? article.fromSelectors(selectors)
          : article.fromHtml();
        console.log(`${chalk.blue.bold("Parsed")} ${url}`);
        return { result: await result, order };
      }
    );

    const parsedArticles = await Promise.all(parseArticlesJob);

    console.log(`${chalk.blue.bold("Building EPUB...")}`);
    const builder = new ReaderFileBuilder();

    // Sort parsed articles so ebook's ToC resembles initial url order
    const sortedParsedArticles = parsedArticles
      .sort((a, b) => a.order - b.order)
      .reduce<ParsedArticle[]>((acc, x) => [...acc, x.result], []);
    const file = await builder.build(sortedParsedArticles);

    if (outputPath !== undefined) {
      console.log(`${chalk.blue.bold("Saving on disk...")}`);
      try {
        await file.save(outputPath);
      } catch (error) {
        await file.cleanup();
        if (error instanceof CommitReaderFileError) {
          console.log(chalk.bold.red(error.message));
        } else {
          throw error;
        }
        return;
      }
    }

    // Send email
    /*
      I know this is probably going to bite me in the ass but I couldn't
      find any email library that allows this level of flexibility and
      Amazon expects emails to be formatted in a certain way. 

      Nodemailer for example failed to attach binaries in a way that's
      understandable by Amazon's "Send to device".
    */
    if (config?.toDevice) {
      try {
        console.log(`${chalk.blue.bold("Sending an email...")}`);

        const now = new Date();
        const padDateMonth = (n: number) => n.toString().padStart(2, "0");
        const todaysDateString = `${now.getFullYear()}-${padDateMonth(
          now.getMonth() + 1
        )}-${padDateMonth(now.getDate())}`;
        const attachmentName = `${todaysDateString} news.epub`;

        const { deviceEmail, senderEmail, senderPassword } = config.toDevice;

        // I send emails only from this place. No need to prematurely optimise
        await new Promise(async (resolve, reject) => {
          const smtp = new SMTPChannel({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
          });

          smtp.on("error", (err: unknown) => {
            reject(err);
          });
          smtp.on("close", (...args: unknown[]) => {
            resolve(args);
          });

          await smtp.connect({ timeout: 3000 });
          await smtp.write("EHLO smtp.gmail.com\r\n");

          const base64Username = Buffer.from(senderEmail).toString("base64");
          const base64Password = Buffer.from(senderPassword).toString("base64");

          await smtp.write("AUTH LOGIN\r\n");
          await smtp.write(`${base64Username}\r\n`);
          await smtp.write(`${base64Password}\r\n`);

          await smtp.write(`MAIL FROM:<${senderEmail}>\r\n`);
          await smtp.write(`RCPT TO:<${deviceEmail}>\r\n`);
          await smtp.write(`DATA\r\n`);
          const attachmentId = uuid();
          const dataLines: string[] = [
            "MIME-Version: 1.0",
            "Subject: Your Subject",
            `From: <${senderEmail}>`,
            `X-Universally-Unique-Identifier: ${uuid()}`,
            `To: ${deviceEmail}`,
            'Content-Type: multipart/mixed; boundary="boundary123"',
            "--boundary123",
            `Content-Type: application/epub+zip; name="${attachmentName}"`,
            `Content-Disposition: attachment; filename="${attachmentName}"`,
            "Content-Transfer-Encoding: base64",
            `X-Attachment-Id: ${attachmentId}`,
            `Content-ID: <${attachmentId}>`,
            "",
            (await file.getBuff()).toString("base64"),
            "--boundary123--",
          ];
          dataLines.forEach(async (line) => await smtp.write(`${line}\r\n`));
          await smtp.write("\r\n.\r\n");

          await smtp.write("QUIT\r\n");
        });
      } catch (error) {
        console.log(
          chalk.bold.red(
            "Error during sending to device. Please double check your credentials and try again."
          )
        );
        await file.cleanup();
        return;
      }
    }

    console.log(`${chalk.blue.bold("Cleanup...")}`);
    await file.cleanup();

    console.log(`${chalk.green.bold("Finished successfully!")}`);
  });

program.parseAsync();
