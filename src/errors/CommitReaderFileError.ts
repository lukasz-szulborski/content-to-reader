/**
 * Generated e-books are first saved in a temporary location.
 * If commiting them (eg. saving to disc, sending to S3) fails
 * then you can use this error.
 */
export class CommitReaderFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommitReaderFileError";
  }
}
