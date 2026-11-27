/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Streams a JSON array of documents (the Red Hat CSAF feed shape) one document at
 * a time, the JSON analogue of how oval.ts streams one definition at a time: only
 * the current document's bytes are held, each finished document is handed to
 * `onDocument` and dropped, and the event loop gets a turn after every input chunk,
 * so a large in-memory body must be fed in slices, not as one chunk. Multibyte
 * characters split across chunks are decoded with a streaming decoder. A single
 * document larger than `MAX_DOCUMENT_BYTES` is refused rather than buffered unbounded.
 */

export interface ReadJsonDocumentsHandlers {
  onDocument: (doc: unknown) => void;
}

/** A CSAF advisory is a few hundred KB; this is a backstop against hostile input. */
export const MAX_DOCUMENT_BYTES = 32 * 1024 * 1024;

const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/**
 * Feeds a chunk of top-level-array document text to `onDocument`. Returns the
 * number of bytes consumed; any trailing partial document must be re-fed next
 * call (only whitespace can trail a complete document at this level).
 */
class DocumentSplitter {
  private buffer = '';
  private started = false;

  push(chunk: string, handlers: ReadJsonDocumentsHandlers): number {
    this.buffer += chunk;
    if (!this.started) {
      const open = this.skipWhitespace(0);
      if (open >= this.buffer.length) return this.buffer.length;
      if (this.buffer[open] !== '[') throw new Error('CSAF feed is not a JSON array of objects');
      this.buffer = this.buffer.slice(open + 1);
      this.started = true;
    }
    for (;;) {
      let start = this.skipWhitespace(0);
      // The comma between documents can arrive in a later chunk than the document it follows.
      if (this.buffer[start] === ',') start = this.skipWhitespace(start + 1);
      if (start >= this.buffer.length) break;
      if (this.buffer[start] === ']') break; // end of the top-level array
      if (this.buffer[start] !== '{') {
        throw new Error('CSAF feed is not a JSON array of objects');
      }
      const end = this.findDocumentEnd(start);
      if (end < 0) {
        if (this.buffer.length - start > MAX_DOCUMENT_BYTES) {
          throw new Error(
            `CSAF advisory document is over ${MAX_DOCUMENT_BYTES} bytes (${
              this.buffer.length - start
            } read)`
          );
        }
        break;
      }
      const text = this.buffer.slice(start, end);
      if (text.length > MAX_DOCUMENT_BYTES) {
        throw new Error(
          `CSAF advisory document is over ${MAX_DOCUMENT_BYTES} bytes (${text.length} read)`
        );
      }
      this.buffer = this.buffer.slice(end);
      handlers.onDocument(JSON.parse(text));
    }
    return this.buffer.length;
  }

  /** Index just past the object that starts at `start`, or -1 while it is incomplete. */
  private findDocumentEnd(start: number): number {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < this.buffer.length; i++) {
      const c = this.buffer[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (c === '\\') escaped = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') inString = true;
      else if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return i + 1;
      }
    }
    return -1;
  }

  private skipWhitespace(from: number): number {
    let i = from;
    while (i < this.buffer.length && /\s/.test(this.buffer[i])) i++;
    return i;
  }
}

export const readJsonDocuments = async (
  input: AsyncIterable<Uint8Array | string> | Iterable<Uint8Array | string>,
  handlers: ReadJsonDocumentsHandlers
): Promise<void> => {
  const splitter = new DocumentSplitter();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  for await (const chunk of input) {
    splitter.push(
      typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true }),
      handlers
    );
    await yieldToEventLoop();
  }
  const tail = decoder.decode();
  if (tail) splitter.push(tail, handlers);
};
