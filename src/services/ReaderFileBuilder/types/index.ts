export interface ArticleSnippet {
  htmlSnippet: string;
  metadata: ArticleSnippetMetadata;
}

export interface ArticleSnippetMetadata {
  title: string;
  url: string;
  keywords?: string[];
}

export type ArticleSnippetStaticValidationResultType =
  | "EMPTY_TITLE"
  | "INVALID_HTML";

export interface ArticleSnippetStaticValidationResult {
  type: ArticleSnippetStaticValidationResultType;
  content: string;
}
