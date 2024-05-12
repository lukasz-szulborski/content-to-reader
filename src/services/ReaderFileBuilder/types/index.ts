export type ArticleSnippetStaticValidationResultType = "EMPTY_TITLE";

export interface ArticleSnippetStaticValidationResult {
  type: ArticleSnippetStaticValidationResultType;
  content: string;
}
