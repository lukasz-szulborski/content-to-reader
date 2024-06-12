import { ZodError } from "zod";

export const configValidationErrorToHumanReadable = (
  error: ZodError
): string => {
  const issue = (error as ZodError).issues[0];

  if (!("unionErrors" in issue)) return "Unknown error";

  // Get last and deepest unionError
  const aux = (unionErrorObject: ZodError<any>[], acc: string): string => {
    const lastError = unionErrorObject.at(-1);
    if (!lastError) return acc;
    const errors = lastError.issues
      .map((issue) =>
        "unionErrors" in issue
          ? aux(issue.unionErrors, acc)
          : `[${issue.path.join(" -> ")}]: ${issue.message}`
      )
      .join(", \n\t");
    return errors;
  };

  return `[\n\t${aux(issue.unionErrors, "")}\n]`;
};
