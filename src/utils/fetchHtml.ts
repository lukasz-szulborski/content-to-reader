/**
 * Takes a set of urls, makes HTTP GET request
 * and returns HTML resulting from each url.
 *
 * If you pass an empty array it will return an empty object.
 * */
export const fetchHtml = async (
  urls: string[]
): Promise<Record<string, string>> => {
  if (urls.length === 0) return {};
  const getHtmlJobs = urls.map((url) =>
    fetch(url).then(async (response) => ({ url, html: await response.text() }))
  );
  const results = await Promise.all(getHtmlJobs);
  // Return a dictionary mapping each unique url to the resulting HTML
  return results.reduce(
    (acc, { html, url }) => Object.assign(acc, { [url]: html }),
    {}
  );
};
