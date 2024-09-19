import { Cluster } from "puppeteer-cluster";

type FetchHtmlResult = Record<string, { html: string; order: number }>;

/**
 * Takes a set of urls, makes HTTP GET request, evaluates HTML
 * and returns HTML resulting from each url.
 *
 * If you pass an empty array it will return an empty object.
 * */
export const fetchHtml = async (
  urls: string[],
  successCallback?: (url: string) => void
): Promise<FetchHtmlResult> => {
  if (urls.length === 0) return {};

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 16,
    skipDuplicateUrls: true,
  });

  const results: FetchHtmlResult = {};
  const errors: Record<string, string> = {};
  const retryUrls: string[] = [];

  await cluster.task(async ({ page, data }) => {
    const [url, idx] = data;
    try {
      const httpRes = await page.goto(url);
      if (!httpRes || !httpRes.ok) {
        errors[url] = "error";
        return;
      }
      // Sometimes browsers require verification. If that's the case then save this url for later and try fetching it the traditional way using `fetch`. This is a workaround and doesn't allow for interpreting of redirected pages. Can be improved.
      if (httpRes?.request().redirectChain() ?? 0 > 0) {
        // @TODO: Can I fetch this url immediately after push?
        retryUrls.push(url);
      } else {
        results[url] = {
          html: await httpRes?.text(),
          order: idx,
        };
        if (successCallback) successCallback(url);
      }
    } catch (error) {
      errors[url] = (error as any).toString();
    }
  });

  urls.map((url, idx) => cluster.queue([url, idx]));

  await cluster.idle();
  await cluster.close();

  // If cluster found any errors then throw them
  if (Object.entries(errors).length > 0) {
    throw new Error(
      Object.entries(errors)
        .map((error) => error.join(" -> "))
        .join("\n")
    );
  }

  // Re-try those that weren't fetched by puppeteer
  const retryResults: FetchHtmlResult = (
    await Promise.all(
      retryUrls.map(
        (url, idx): Promise<FetchHtmlResult> =>
          fetch(url).then(async (response) => {
            if (successCallback) successCallback(url);
            return {
              [url]: {
                html: await response.text(),
                order: idx,
              },
            };
          })
      )
    )
  ).reduce((acc, result) => Object.assign(acc, result), {});

  return Object.assign(results, retryResults);
};
