export type ArticleSnippetStaticValidationResultType =
  | "EMPTY_TITLE"
  | "INVALID_HTML";

export interface ArticleSnippetStaticValidationResult {
  type: ArticleSnippetStaticValidationResultType;
  content: string;
}
