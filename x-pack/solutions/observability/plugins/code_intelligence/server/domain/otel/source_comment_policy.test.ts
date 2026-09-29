/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  commentStateAfter,
  outsideSourceCommentState,
  sourceWithoutComments,
} from './source_comment_policy';

/** Verifies multiline literal lexical state masks OTel-looking text without hiding later executable source. */
describe('source comment policy multiline literals', () => {
  it.each([
    ['src/a.py', '"""\nspan.recordException(error)\n"""\nspan.recordException(error)'],
    ['src/a.java', '"""\nspan.recordException(error)\n"""\nspan.recordException(error)'],
    ['src/a.cs', '"""\nspan.recordException(error)\n"""\nspan.recordException(error)'],
    ['src/a.rs', 'r#"\nspan.recordException(error)\n"#\nspan.recordException(error)'],
    ['src/a.ts', '`\nspan.recordException(error)\n`\nspan.recordException(error)'],
  ])('masks multiline literal instrumentation in %s', (path, content) => {
    /** Holds local test or extraction state. */
    const masked = sourceWithoutComments({ content, path });
    expect(masked.match(/recordException/g)).toHaveLength(1);
  });

  it('keeps C# verbatim doubled quotes and delimiter-like content inside the literal', () => {
    /** Holds local test or extraction state. */
    const masked = sourceWithoutComments({
      content:
        '@"escaped "" quote /* span.recordException(error) "" still literal"\nspan.recordException(error)',
      path: 'src/a.cs',
    });
    expect(masked.match(/recordException/g)).toHaveLength(1);
    expect(commentStateAfter({ content: '@"/* "" text\n', path: 'src/a.cs' }).inBlockComment).toBe(
      false
    );
  });

  it('masks C# interpolated-verbatim @$ strings until their true close', () => {
    /** Holds local test or extraction state. */
    const masked = sourceWithoutComments({
      content:
        '@$"escaped "" /* span.recordException(error) "" literal"\nspan.recordException(error)',
      path: 'src/a.cs',
    });
    expect(masked.match(/recordException/g)).toHaveLength(1);
  });

  it('requires an exact C# raw-string quote run before exposing executable source', () => {
    /** Holds local test or extraction state. */
    const masked = sourceWithoutComments({
      content:
        '""""\nspan.recordException(error)\n"""\nspan.recordException(error)\n""""\nspan.recordException(error)',
      path: 'src/a.cs',
    });
    expect(masked.match(/recordException/g)).toHaveLength(1);
  });

  it('keeps Rust nested block comments masked until the outer close', () => {
    /** Holds local test or extraction state. */
    const masked = sourceWithoutComments({
      content: '/* outer\n/* inner */\nspan.record_error(err)\n*/\nspan.record_error(err)',
      path: 'src/a.rs',
    });
    expect(masked.match(/record_error/g)).toHaveLength(1);
  });

  it('masks Rust byte raw-string content through its distinct br opening prefix', () => {
    /** Holds local test or extraction state. */
    const content: string = 'br"span.record_error(error)"\nspan.record_error(error)';
    /** Holds the source with the raw literal masked but the later executable call retained. */
    const masked: string = sourceWithoutComments({ content, path: 'src/a.rs' });
    expect(masked.match(/record_error/g)).toHaveLength(1);
    expect(commentStateAfter({ content, path: 'src/a.rs' }).multilineDelimiter).toBeUndefined();
  });

  it('carries Python triple-quote state across indexed source lines', () => {
    /** Holds local test or extraction state. */
    const opened = commentStateAfter({
      content: '"""\n',
      initialState: outsideSourceCommentState,
      path: 'src/a.py',
    });
    expect(opened.multilineDelimiter).toBe('"""');
    expect(
      sourceWithoutComments({
        content: 'span.recordException(error)\n"""\nspan.recordException(error)',
        initialState: opened,
        path: 'src/a.py',
      }).match(/recordException/g)
    ).toHaveLength(1);
  });
});
