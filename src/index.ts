#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";

import { ConfigurationParser } from "@services/Configuration";
import { Article } from "@services/Article";
import { ReaderFileBuilder } from "@services/ReaderFileBuilder";
import { fetchHtml } from "@utils/fetchHtml";

const program = new Command();

program
  .name("content-to-reader")
  .description("CLI utility for creating EPUBs from WWW pages.")
  .version("0.0.1");

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

    if (outputPath === undefined) {
      console.log(chalk.bold.red("outputPath === undefined"));
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

    console.log(`${chalk.blue.bold("Parsing pages...")}`);
    const parseArticlesJob = Object.entries(fetched).map(([url, html]) => {
      const article = new Article({ html, url });

      if (!config) return article.fromHtml();

      // Find config related to this URL and get selectors
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
      return result;
    });

    const parsedArticles = await Promise.all(parseArticlesJob);

    console.log(`${chalk.blue.bold("Building EPUB...")}`);
    const builder = new ReaderFileBuilder();
    const file = await builder.build(parsedArticles);

    console.log(`${chalk.blue.bold("Saving on disk...")}`);
    try {
      await file.save(outputPath);
    } catch (error) {
      await file.cleanup();
      throw error;
    }

    // @TODO: email send (fix amazon not accepting first)
    // ...

    console.log(`${chalk.blue.bold("Cleanup...")}`);
    await file.cleanup();

    console.log(`${chalk.green.bold("Finished successfully!")}`);
  });

program.parseAsync();
