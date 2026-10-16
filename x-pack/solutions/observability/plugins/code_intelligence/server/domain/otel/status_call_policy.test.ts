/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasSupportedStatusErrorArgument } from './status_call_policy';

/** Evaluates one status call from its opening parenthesis using its source-file comment rules. */
const hasErrorStatus = (content: string, path: string): boolean =>
  hasSupportedStatusErrorArgument({
    content,
    openParenthesis: content.indexOf('('),
    path,
  });

/** Verifies bounded status-call lexical parsing. */
describe('hasSupportedStatusErrorArgument', () => {
  it('accepts supported error tokens inside nested executable delimiters', () => {
    expect(
      hasErrorStatus(
        'span.setStatus({ code: statusFor({ retry: false, code: SpanStatusCode.ERROR }) })',
        'src/status.ts'
      )
    ).toBe(true);
    expect(hasErrorStatus('span.setStatus(StatusCode.ERROR)', 'src/status.ts')).toBe(true);
    expect(hasErrorStatus('span.setStatus(StatusCode.Error)', 'src/status.ts')).toBe(true);
    expect(hasErrorStatus('span.SetStatus(kError)', 'src/status.cc')).toBe(true);
    expect(
      hasErrorStatus('span.set_status(Status::Error { description: "failed" })', 'src/status.rs')
    ).toBe(true);
  });

  it('rejects supported tokens inside strings and path-aware comments', () => {
    expect(
      hasErrorStatus(
        'activity.SetStatus(ActivityStatusCode.Ok, "SpanStatusCode.ERROR was handled")',
        'src/status.cs'
      )
    ).toBe(false);
    expect(
      hasErrorStatus(
        'span.setStatus(SpanStatusCode.OK /* SpanStatusCode.ERROR */)',
        'src/status.ts'
      )
    ).toBe(false);
    expect(hasErrorStatus('span.set_status(codes.Ok # codes.Error)', 'src/status.py')).toBe(false);
    expect(hasErrorStatus('span.set_status(DbStatus::Error)', 'src/status.rs')).toBe(false);
    expect(hasErrorStatus('span.SetStatus(networkErrorCount)', 'src/status.cc')).toBe(false);
  });

  it('rejects malformed target-call delimiter nesting', () => {
    expect(hasErrorStatus('span.setStatus({ code: SpanStatusCode.ERROR ])', 'src/status.ts')).toBe(
      false
    );
  });
});
