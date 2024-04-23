import { ReaderFile } from "@services/ReaderFileBuilder";

interface ArticleSnippet {
  htmlSnippet: string;
  metadata: {
    title: string;
    url: string;
    keywords?: string[];
  };
}

interface ReaderFileBuilderMethods {
  /**
   * Takes HTML snippets and transforms them into `ReaderFile` that points to a binary.
   *
   * @argument htmlSnippets - each being a section that semantically represent an article. In the best case scenario `<article>...</article>` should be the topmost element in such a snippet.
   */
  build(htmlSnippets: ArticleSnippet[]): Promise<ReaderFile>;
}

type ReaderFileBuilderClass = ReaderFileBuilderMethods;

/**
 * An object that takes HTML snippets that represent various articles.
 *
 * It merges those snippets into nice and tidy EPUB file (ReaderFile). In the future it may allow different formats. I use EPUB here because it's my favourite format.
 *
 * @TODO: In the future, besides mapping HTML to epub, it will also control how the output EPUB looks like.
 *
 * For implementation details refer to specific functions' descriptions.
 */
export class ReaderFileBuilder implements ReaderFileBuilderClass {
  build(htmlSnippets: ArticleSnippet[]): Promise<ReaderFile> {
    throw new Error("Method not implemented.");
  }
}
