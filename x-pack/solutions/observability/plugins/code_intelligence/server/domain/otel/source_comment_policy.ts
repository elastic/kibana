/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Represents lexical comment state inherited from source before a bounded window or matched line. */
export interface SourceCommentState {
  readonly blockCommentDepth?: number;
  readonly escaped?: boolean;
  readonly inBlockComment: boolean;
  readonly inLineComment?: boolean;
  readonly multilineDelimiter?: string;
  readonly quote?: string;
}

/** Returns whether a path uses hash comments in source or eligible configuration formats. */
export const supportsHashComments = (path: string): boolean =>
  /\.(?:py|rb|php|ya?ml|toml|properties|conf|ini)$/i.test(path);

/** Returns whether an apostrophe begins a Rust lifetime rather than a character literal. */
const isRustLifetimeStart = (content: string, index: number, path: string): boolean =>
  /\.rs$/i.test(path) && /[A-Za-z_]/.test(content[index + 1] ?? '') && content[index + 2] !== "'";

/** Returns whether a currently open quote is a Go raw string with no backslash escape semantics. */
const isGoRawString = (path: string, quote: string): boolean =>
  /\.go$/i.test(path) && quote === '`';

/** Describes a multiline literal's distinct opening prefix and closing delimiter. */
interface MultilineLiteralDelimiter {
  readonly closingDelimiter: string;
  readonly openingLength: number;
}

/** Returns a supported multiline literal delimiter model when one begins at this source offset. */
const multilineDelimiterAt = (
  content: string,
  index: number,
  path: string
): MultilineLiteralDelimiter | undefined => {
  /** Rust raw strings close with a quote followed by exactly their opening hash sequence. */
  const rustRaw: RegExpMatchArray | null = /^(?:r|br)(#{0,16})"/.exec(content.slice(index));
  if (/\.rs$/i.test(path) && rustRaw !== null)
    return { closingDelimiter: `"${rustRaw[1]}`, openingLength: rustRaw[0].length };
  /** C# raw strings close only on the exact opening run of 3 or more quotes. */
  const csharpRaw: RegExpMatchArray | null = /^("{3,})/.exec(content.slice(index));
  if (/\.cs$/i.test(path) && csharpRaw !== null)
    return { closingDelimiter: csharpRaw[1], openingLength: csharpRaw[1].length };
  if (/\.(?:py|java|kt|kts)$/i.test(path) && content.startsWith('"""', index))
    return { closingDelimiter: '"""', openingLength: 3 };
  if (/\.(?:[cm]?[jt]sx?)$/i.test(path) && content.startsWith('`', index)) {
    /** Same-line template arguments remain ordinary executable string syntax for signal extraction. */
    const closingDelimiter: number = content.indexOf('`', index + 1);
    /** A newline before closure means the template literal remains active across source lines. */
    const newline: number = content.indexOf('\n', index + 1);
    if (closingDelimiter === -1 || (newline !== -1 && closingDelimiter > newline))
      return { closingDelimiter: '`', openingLength: 1 };
  }
  if (/\.py$/i.test(path) && content.startsWith("'''", index))
    return { closingDelimiter: "'''", openingLength: 3 };
  /** C# verbatim strings retain doubled quotes as literal content until one unpaired quote closes. */
  if (/\.cs$/i.test(path)) {
    if (content.startsWith('$@"', index)) return { closingDelimiter: '$@"', openingLength: 3 };
    if (content.startsWith('@$"', index)) return { closingDelimiter: '@$"', openingLength: 3 };
    if (content.startsWith('@"', index)) return { closingDelimiter: '@"', openingLength: 2 };
  }
  return undefined;
};

/** Returns whether one retained delimiter represents a C# verbatim string prefix. */
const isCsharpVerbatimDelimiter = (delimiter: string): boolean =>
  delimiter === '@"' || delimiter === '$@"' || delimiter === '@$"';

/** Initial lexical state for callers without repository-level delimiter context. */
export const outsideSourceCommentState: SourceCommentState = {
  blockCommentDepth: 0,
  escaped: false,
  inBlockComment: false,
  inLineComment: false,
  multilineDelimiter: undefined,
  quote: undefined,
};

/** Scans one source fragment and returns its block-comment state after quote-aware lexical handling. */
export const commentStateAfter = ({
  content,
  initialState = outsideSourceCommentState,
  path,
}: {
  readonly content: string;
  readonly initialState?: SourceCommentState;
  readonly path: string;
}): SourceCommentState => {
  /** The active multiline closing delimiter masks comment markers across repository lines. */
  let multilineDelimiter: string | undefined = initialState.multilineDelimiter;
  /** The active string delimiter prevents comment markers in quoted values from changing comment state. */
  let quote: string | undefined = initialState.quote;
  /** Escapes suppress quote handling for the immediately following character. */
  let escaped: boolean = initialState.escaped ?? false;
  /** Line comments end at a newline. */
  let lineComment: boolean = false;
  /** Rust block comments nest; other supported source forms retain one non-nested depth. */
  let blockCommentDepth: number =
    initialState.blockCommentDepth ?? (initialState.inBlockComment ? 1 : 0);
  for (let index: number = 0; index < content.length; index += 1) {
    /** Reads one source character while retaining lexical state across the bounded fragment. */
    const character: string = content[index];
    /** Reads ahead only for two-character block and slash-comment delimiters. */
    const nextCharacter: string = content[index + 1] ?? '';
    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (multilineDelimiter !== undefined) {
      if (
        isCsharpVerbatimDelimiter(multilineDelimiter) &&
        character === '"' &&
        nextCharacter === '"'
      ) {
        index += 1;
      } else if (
        (isCsharpVerbatimDelimiter(multilineDelimiter) && character === '"') ||
        content.startsWith(multilineDelimiter, index)
      ) {
        index +=
          (isCsharpVerbatimDelimiter(multilineDelimiter) ? 1 : multilineDelimiter.length) - 1;
        multilineDelimiter = undefined;
      }
      continue;
    }
    if (blockCommentDepth > 0) {
      if (/\.rs$/i.test(path) && character === '/' && nextCharacter === '*') {
        blockCommentDepth += 1;
        index += 1;
      } else if (character === '*' && nextCharacter === '/') {
        blockCommentDepth -= 1;
        index += 1;
      }
      continue;
    }
    if (quote !== undefined) {
      if (escaped) escaped = false;
      else if (character === '\\' && !isGoRawString(path, quote)) escaped = true;
      else if (character === quote) quote = undefined;
      // Only template literals may span repository lines; ordinary quotes reset at the line boundary.
      else if (character === '\n' && quote !== '`') quote = undefined;
      continue;
    }
    if (character === '/' && (nextCharacter === '/' || nextCharacter === '*')) {
      lineComment = nextCharacter === '/';
      blockCommentDepth = nextCharacter === '*' ? 1 : 0;
      index += 1;
      continue;
    }
    if (character === '#' && supportsHashComments(path)) {
      lineComment = true;
      continue;
    }
    /** Multiline literal recognition precedes ordinary quote handling. */
    const multilineStart: MultilineLiteralDelimiter | undefined = multilineDelimiterAt(
      content,
      index,
      path
    );
    if (multilineStart !== undefined) {
      multilineDelimiter = multilineStart.closingDelimiter;
      index += multilineStart.openingLength - 1;
      continue;
    }
    if (
      character === '"' ||
      character === '`' ||
      (character === "'" && !isRustLifetimeStart(content, index, path))
    )
      quote = character;
  }
  return {
    blockCommentDepth,
    escaped,
    inBlockComment: blockCommentDepth > 0,
    inLineComment: lineComment,
    multilineDelimiter,
    quote,
  };
};

/** Returns whether an offset occurs inside non-executable source: comments or open string literals. */
export const isNonExecutableAtOffset = ({
  content,
  initialState = outsideSourceCommentState,
  offset,
  path,
}: {
  readonly content: string;
  readonly initialState?: SourceCommentState;
  readonly offset: number;
  readonly path: string;
}): boolean => {
  /** Prefix scanning reuses the lexical state machine and preserves quote-aware delimiter handling. */
  const state: SourceCommentState = commentStateAfter({
    content: content.slice(0, offset),
    initialState,
    path,
  });
  /** Comments and open string forms are non-executable lexical regions at the requested offset. */
  return (
    state.inBlockComment ||
    state.inLineComment === true ||
    state.multilineDelimiter !== undefined ||
    state.quote !== undefined
  );
};

/** Masks comments with spaces while preserving every source offset and newline for regex extraction. */
export const sourceWithoutComments = ({
  content,
  initialState = outsideSourceCommentState,
  path,
}: {
  readonly content: string;
  readonly initialState?: SourceCommentState;
  readonly path: string;
}): string => {
  /** Preserved characters maintain exact evidence offsets; comments become whitespace. */
  const characters: string[] = [...content];
  /** The active multiline delimiter masks literal content inherited across bounded windows. */
  let multilineDelimiter: string | undefined = initialState.multilineDelimiter;
  /** The active quote keeps ordinary argument strings intact across bounded windows. */
  let quote: string | undefined = initialState.quote;
  /** Escapes suppress quote handling for the next character. */
  let escaped: boolean = initialState.escaped ?? false;
  /** Inherited quotes must be masked because their opener lies outside this bounded source window. */
  let maskInheritedQuote: boolean = quote !== undefined;
  /** Tracks until a newline after slash or hash comments. */
  let lineComment: boolean = false;
  /** Carries repository-indexed nested Rust block depth into bounded windows. */
  let blockCommentDepth: number =
    initialState.blockCommentDepth ?? (initialState.inBlockComment ? 1 : 0);
  for (let index: number = 0; index < characters.length; index += 1) {
    /** The original character remains available before comment masking mutates the output. */
    const character: string = characters[index];
    /** Reads ahead only for paired comment delimiters. */
    const nextCharacter: string = characters[index + 1] ?? '';
    if (lineComment) {
      if (character === '\n') lineComment = false;
      else characters[index] = ' ';
      continue;
    }
    if (multilineDelimiter !== undefined) {
      if (
        isCsharpVerbatimDelimiter(multilineDelimiter) &&
        character === '"' &&
        nextCharacter === '"'
      ) {
        characters[index] = ' ';
        characters[index + 1] = ' ';
        index += 1;
      } else if (
        (isCsharpVerbatimDelimiter(multilineDelimiter) && character === '"') ||
        content.startsWith(multilineDelimiter, index)
      ) {
        /** Verbatim strings close on one quote; every other multiline form closes on its exact delimiter. */
        const delimiterLength: number = isCsharpVerbatimDelimiter(multilineDelimiter)
          ? 1
          : multilineDelimiter.length;
        for (let delimiterIndex: number = 0; delimiterIndex < delimiterLength; delimiterIndex += 1)
          characters[index + delimiterIndex] = ' ';
        index += delimiterLength - 1;
        multilineDelimiter = undefined;
      } else if (character !== '\n') characters[index] = ' ';
      continue;
    }
    if (blockCommentDepth > 0) {
      if (/\.rs$/i.test(path) && character === '/' && nextCharacter === '*') {
        characters[index] = ' ';
        characters[index + 1] = ' ';
        blockCommentDepth += 1;
        index += 1;
      } else if (character === '*' && nextCharacter === '/') {
        characters[index] = ' ';
        characters[index + 1] = ' ';
        blockCommentDepth -= 1;
        index += 1;
      } else if (character !== '\n') characters[index] = ' ';
      continue;
    }
    if (quote !== undefined) {
      if (maskInheritedQuote && character !== '\n') characters[index] = ' ';
      if (escaped) escaped = false;
      else if (character === '\\' && !isGoRawString(path, quote)) escaped = true;
      else if (character === quote) {
        quote = undefined;
        maskInheritedQuote = false;
      }
      // Only template literals may span repository lines; ordinary quotes reset at the line boundary.
      else if (character === '\n' && quote !== '`') {
        quote = undefined;
        maskInheritedQuote = false;
      }
      continue;
    }
    if (character === '/' && (nextCharacter === '/' || nextCharacter === '*')) {
      characters[index] = ' ';
      characters[index + 1] = ' ';
      lineComment = nextCharacter === '/';
      blockCommentDepth = nextCharacter === '*' ? 1 : 0;
      index += 1;
      continue;
    }
    if (character === '#' && supportsHashComments(path)) {
      characters[index] = ' ';
      lineComment = true;
      continue;
    }
    /** Multiline literals are masked to prevent OTel-looking text from becoming extraction evidence. */
    const multilineStart: MultilineLiteralDelimiter | undefined = multilineDelimiterAt(
      content,
      index,
      path
    );
    if (multilineStart !== undefined) {
      for (
        let delimiterIndex: number = 0;
        delimiterIndex < multilineStart.openingLength;
        delimiterIndex += 1
      )
        characters[index + delimiterIndex] = ' ';
      multilineDelimiter = multilineStart.closingDelimiter;
      index += multilineStart.openingLength - 1;
      continue;
    }
    if (
      character === '"' ||
      character === '`' ||
      (character === "'" && !isRustLifetimeStart(content, index, path))
    )
      quote = character;
  }
  return characters.join('');
};
