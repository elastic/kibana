/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Characterization tests pinning the current io-ts behavior of the synthetics
 * custom scalar codecs before the zod migration. These codecs are hand-written
 * `t.Type`s whose validation lives in the *decode* function (their `.is()`
 * guard only checks `typeof === 'string'`), so the migration must reproduce the
 * decode-side rules — not just the wire type. The suites run through the
 * codec-agnostic `decode` helper so the same expectations can be pointed at the
 * zod twins unchanged once they exist.
 */

import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';
import type * as t from 'io-ts';
import { decode, type DecodeOutcome } from './test_helpers/codec_agnostic';
import {
  getNonEmptyStringCodec,
  InlineScriptString,
  NameSpaceString,
  TimeoutString,
} from './common';

interface CodecUnderTest<A> {
  flavor: 'io-ts' | 'zod';
  decode: (input: unknown) => DecodeOutcome<A>;
}

// Only the io-ts flavor exists today; the migration PR appends `zodCodec(...Zod)`
// to each `describe.each` array so the identical expectations run against both.
const ioTsCodec = <A, O>(codec: t.Type<A, O, unknown>): CodecUnderTest<A> => ({
  flavor: 'io-ts',
  decode: (input) => decode(codec, input),
});

describe.each([ioTsCodec(NameSpaceString)])('NameSpaceString ($flavor)', (codec) => {
  it.each(['default', 'testnamespace'])('accepts valid namespace %p', (input) => {
    expect(codec.decode(input).success).toBe(true);
  });

  // Enforces Fleet namespace rules (via `isValidNamespace`), not just `typeof string`.
  it.each(['With Space And Upper', 'a'.repeat(300), 42, null, undefined, {}])(
    'rejects invalid namespace %p',
    (input) => {
      expect(codec.decode(input).success).toBe(false);
    }
  );
});

describe.each([ioTsCodec(TimeoutString)])('TimeoutString ($flavor)', (codec) => {
  it.each(['16', '1.5', '0'])('accepts numeric string %p', (input) => {
    expect(codec.decode(input).success).toBe(true);
  });

  it.each(['', '   ', 'abc', 16, null, undefined])('rejects %p', (input) => {
    expect(codec.decode(input).success).toBe(false);
  });
});

describe.each([ioTsCodec(getNonEmptyStringCodec('host'))])(
  'getNonEmptyStringCodec ($flavor)',
  (codec) => {
    it.each(['localhost', 'a'])('accepts non-empty string %p', (input) => {
      expect(codec.decode(input).success).toBe(true);
    });

    // Whitespace-only is rejected because the codec trims — `z.string().min(1)`
    // would not be equivalent here.
    it.each(['', '   ', 42, null])('rejects %p', (input) => {
      expect(codec.decode(input).success).toBe(false);
    });
  }
);

describe.each([ioTsCodec(InlineScriptString)])('InlineScriptString ($flavor)', (codec) => {
  it.each(['step("a step", async () => {})', ''])('accepts %p', (input) => {
    expect(codec.decode(input).success).toBe(true);
  });

  it.each([
    'journey("a journey", () => {})', // full journey scripts are rejected
    'console.log("no step here")', // must contain at least one step definition
    42,
    null,
  ])('rejects %p', (input) => {
    expect(codec.decode(input).success).toBe(false);
  });
});

describe.each([ioTsCodec(NonEmptyString)])('NonEmptyString ($flavor)', (codec) => {
  it.each(['x', 'value'])('accepts %p', (input) => {
    expect(codec.decode(input).success).toBe(true);
  });

  it.each(['', '   ', 42, null, undefined])('rejects %p', (input) => {
    expect(codec.decode(input).success).toBe(false);
  });
});
