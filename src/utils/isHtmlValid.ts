import { HtmlValidate } from "html-validate";

/**
 * Takes HTML snippet and checks if it's **valid**.
 * 
 * If you want to know what "valid" is in terms of this software project
 * then go read the code below. Goal of this function isn't to strictly
 * check whether HTML is correct but whether it's correct enough
 * to be interpreted and rendered. I don't care about `alt`s.
 * */
export const isHtmlValid = async (snippet: string): Promise<boolean> => {
  const htmlValidator = new HtmlValidate();
  const validationRes = await htmlValidator.validateString(snippet);
  return (
    validationRes.valid ||
    validationRes.results.find(
      (err) =>
        err.messages.find(
          ({ ruleId, severity }) =>
            ["parser-error", "close-order"].includes(ruleId) || severity > 2
        ) !== undefined
    ) === undefined
  );
};
