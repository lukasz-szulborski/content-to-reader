export interface ParsedArticle {
  htmlSnippet: string;
  metadata: ParsedArticleMetadata;
}

export interface ParsedArticleMetadata {
  title: string;
  url: string;
}
