import { Cluster } from "puppeteer-cluster";

/**
 * Takes a set of urls, makes HTTP GET request, evaluates HTML
 * and returns HTML resulting from each url.
 *
 * If you pass an empty array it will return an empty object.
 * */
export const fetchHtml = async (
  urls: string[]
): Promise<Record<string, string>> => {
  if (urls.length === 0) return {};

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 16,
    skipDuplicateUrls: true,
  });

  const results: Record<string, string> = {};
  const errors: Record<string, string> = {};
  const retryUrls: string[] = [];

  await cluster.task(async ({ page, data: url }) => {
    try {
      const httpRes = await page.goto(url);
      if (!httpRes || !httpRes.ok) {
        errors[url] = "error";
        return;
      }
      // Sometimes browsers require verification. If that's the case then save this url for later and try fetching it the traditional way using `fetch`.
      if (httpRes?.request().redirectChain() ?? 0 > 0) {
        // @TODO: Can I fetch this url immediately after push?
        retryUrls.push(url);
      } else {
        results[url] = await httpRes?.text();
      }
    } catch (error) {
      errors[url] = (error as any).toString();
    }
  });

  urls.map((url) => cluster.queue(url));

  await cluster.idle();
  await cluster.close();

  if (Object.entries(errors).length > 0) {
    throw new Error(
      Object.entries(errors)
        .map((error) => error.join(" -> "))
        .join("\n")
    );
  }

  const retryResults = await Promise.all(
    retryUrls.map((url) =>
      fetch(url).then(async (response) => ({
        url,
        html: await response.text(),
      }))
    )
  );
  const mergedRetryResults = retryResults.reduce(
    (acc, { html, url }) => Object.assign(acc, { [url]: html }),
    {}
  );

  return Object.assign(results, mergedRetryResults);
};
