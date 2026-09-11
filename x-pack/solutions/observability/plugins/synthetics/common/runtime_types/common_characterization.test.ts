/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Characterization tests for the synthetics custom scalar codecs, run against
 * both the io-ts originals and their zod twins.
 *
 * These codecs are hand-written `t.Type`s whose validation lives in the
 * *decode* function (their `.is()` guard only checks `typeof === 'string'`), so
 * the zod twins have to reproduce the decode-side rules, not just the wire
 * type. Each codec gets two layers of checking:
 *
 *  1. both flavors run against the same explicit accept/reject expectations
 *  2. a parity test asserts the two agree — verdict *and* decoded value — over
 *     the combined corpus, which catches differences the explicit lists miss
 */

import { NonEmptyArray, NonEmptyString } from '@kbn/securitysolution-io-ts-types';
import { z } from '@kbn/zod';
import * as t from 'io-ts';
import { decode, type DecodeOutcome } from './test_helpers/codec_agnostic';
import { expectSameOutcome, ioTsCustomMessages, zodMessages } from './test_helpers/parity';
import {
  getNonEmptyStringCodec,
  InlineScriptString,
  NameSpaceString,
  TimeoutString,
} from './common';
import * as zodCommon from './zod/common';

interface CodecUnderTest<A> {
  flavor: 'io-ts' | 'zod';
  decode: (input: unknown) => DecodeOutcome<A>;
}

const ioTsCodec = <A, O>(codec: t.Type<A, O, unknown>): CodecUnderTest<A> => ({
  flavor: 'io-ts',
  decode: (input) => decode(codec, input),
});

const zodCodec = <S extends z.ZodType>(schema: S): CodecUnderTest<z.output<S>> => ({
  flavor: 'zod',
  decode: (input) => decode(schema, input),
});

/**
 * Wraps each input in an args tuple. `it.each` treats a bare array case as the
 * argument list itself, so an array input would otherwise be spread — and `[]`
 * would silently run the test with no arguments at all.
 */
const asCases = (inputs: unknown[]) => inputs.map((input) => [input]);

const namespaceCorpus = {
  valid: ['default', 'testnamespace'],
  invalid: ['With Space And Upper', 'a'.repeat(300), 42, null, undefined, {}],
};

describe.each([ioTsCodec(NameSpaceString), zodCodec(zodCommon.NameSpaceString)])(
  'NameSpaceString ($flavor)',
  (codec) => {
    it.each(namespaceCorpus.valid)('accepts valid namespace %p', (input) => {
      expect(codec.decode(input).success).toBe(true);
    });

    // Enforces Fleet namespace rules (via `isValidNamespace`), not just `typeof string`.
    it.each(namespaceCorpus.invalid)('rejects invalid namespace %p', (input) => {
      expect(codec.decode(input).success).toBe(false);
    });
  }
);

const timeoutCorpus = {
  valid: ['16', '1.5', '0'],
  invalid: ['', '   ', 'abc', 16, null, undefined],
};

describe.each([ioTsCodec(TimeoutString), zodCodec(zodCommon.TimeoutString)])(
  'TimeoutString ($flavor)',
  (codec) => {
    it.each(timeoutCorpus.valid)('accepts numeric string %p', (input) => {
      expect(codec.decode(input).success).toBe(true);
    });

    // `'   '` must be rejected by the trim check before the numeric check,
    // since `Number('   ')` is 0 rather than NaN.
    it.each(timeoutCorpus.invalid)('rejects %p', (input) => {
      expect(codec.decode(input).success).toBe(false);
    });
  }
);

const nonEmptyFieldCorpus = { valid: ['localhost', 'a'], invalid: ['', '   ', 42, null] };

describe.each([
  ioTsCodec(getNonEmptyStringCodec('host')),
  zodCodec(zodCommon.getNonEmptyStringCodec('host')),
])('getNonEmptyStringCodec ($flavor)', (codec) => {
  it.each(nonEmptyFieldCorpus.valid)('accepts non-empty string %p', (input) => {
    expect(codec.decode(input).success).toBe(true);
  });

  // Whitespace-only is rejected because the codec trims — `z.string().min(1)`
  // would not be equivalent here.
  it.each(nonEmptyFieldCorpus.invalid)('rejects %p', (input) => {
    expect(codec.decode(input).success).toBe(false);
  });
});

const inlineScriptCorpus = {
  // A blank script is accepted: it means "not configured yet".
  valid: ['step("a step", async () => {})', '', '   '],
  invalid: [
    'journey("a journey", () => {})', // full journey scripts are rejected
    'console.log("no step here")', // must contain at least one step definition
    42,
    null,
  ],
};

describe.each([ioTsCodec(InlineScriptString), zodCodec(zodCommon.InlineScriptString)])(
  'InlineScriptString ($flavor)',
  (codec) => {
    it.each(inlineScriptCorpus.valid)('accepts %p', (input) => {
      expect(codec.decode(input).success).toBe(true);
    });

    it.each(inlineScriptCorpus.invalid)('rejects %p', (input) => {
      expect(codec.decode(input).success).toBe(false);
    });
  }
);

const nonEmptyStringCorpus = { valid: ['x', 'value'], invalid: ['', '   ', 42, null, undefined] };

describe.each([ioTsCodec(NonEmptyString), zodCodec(zodCommon.NonEmptyString)])(
  'NonEmptyString ($flavor)',
  (codec) => {
    it.each(nonEmptyStringCorpus.valid)('accepts %p', (input) => {
      expect(codec.decode(input).success).toBe(true);
    });

    it.each(nonEmptyStringCorpus.invalid)('rejects %p', (input) => {
      expect(codec.decode(input).success).toBe(false);
    });
  }
);

const nonEmptyArrayCorpus = {
  valid: [['a'], ['a', 'b']],
  invalid: [
    [], // the whole point of the codec
    'not an array',
    null,
    undefined,
    {},
    [1], // element type is enforced by the element codec
    [null],
    ['a', 2],
  ],
};

describe.each([ioTsCodec(NonEmptyArray(t.string)), zodCodec(zodCommon.nonEmptyArray(z.string()))])(
  'nonEmptyArray ($flavor)',
  (codec) => {
    it.each(asCases(nonEmptyArrayCorpus.valid))('accepts %p', (input) => {
      expect(codec.decode(input).success).toBe(true);
    });

    it.each(asCases(nonEmptyArrayCorpus.invalid))('rejects %p', (input) => {
      expect(codec.decode(input).success).toBe(false);
    });
  }
);

/** Element validation is delegated, so a refining element codec must still apply. */
const nonEmptyArrayOfNonEmptyStringCorpus = {
  valid: [['a'], ['a', 'b']],
  invalid: [[], ['   '], ['a', ''], [42]],
};

describe.each([
  ioTsCodec(NonEmptyArray(NonEmptyString)),
  zodCodec(zodCommon.nonEmptyArray(zodCommon.NonEmptyString)),
])('nonEmptyArray of NonEmptyString ($flavor)', (codec) => {
  it.each(asCases(nonEmptyArrayOfNonEmptyStringCorpus.valid))('accepts %p', (input) => {
    expect(codec.decode(input).success).toBe(true);
  });

  it.each(asCases(nonEmptyArrayOfNonEmptyStringCorpus.invalid))('rejects %p', (input) => {
    expect(codec.decode(input).success).toBe(false);
  });
});

describe.each([
  {
    label: 'NameSpaceString',
    ioTs: NameSpaceString,
    zod: zodCommon.NameSpaceString,
    corpus: namespaceCorpus,
  },
  {
    label: 'TimeoutString',
    ioTs: TimeoutString,
    zod: zodCommon.TimeoutString,
    corpus: timeoutCorpus,
  },
  {
    label: 'getNonEmptyStringCodec',
    ioTs: getNonEmptyStringCodec('host'),
    zod: zodCommon.getNonEmptyStringCodec('host'),
    corpus: nonEmptyFieldCorpus,
  },
  {
    label: 'InlineScriptString',
    ioTs: InlineScriptString,
    zod: zodCommon.InlineScriptString,
    corpus: inlineScriptCorpus,
  },
  {
    label: 'NonEmptyString',
    ioTs: NonEmptyString,
    zod: zodCommon.NonEmptyString,
    corpus: nonEmptyStringCorpus,
  },
  {
    label: 'nonEmptyArray',
    ioTs: NonEmptyArray(t.string),
    zod: zodCommon.nonEmptyArray(z.string()),
    corpus: nonEmptyArrayCorpus,
  },
  {
    label: 'nonEmptyArray of NonEmptyString',
    ioTs: NonEmptyArray(NonEmptyString),
    zod: zodCommon.nonEmptyArray(zodCommon.NonEmptyString),
    corpus: nonEmptyArrayOfNonEmptyStringCorpus,
  },
])('$label io-ts/zod parity', ({ ioTs, zod, corpus }) => {
  it.each(asCases([...corpus.valid, ...corpus.invalid]))('agrees on %p', (input) => {
    expectSameOutcome(ioTs, zod, input);
  });
});

/**
 * Whether a codec carries a custom failure message is part of its user-facing
 * contract: `formatErrors` prefers `error.message` and otherwise renders
 * `Invalid value "x" supplied to "<key>"` from the field key. These tests pin
 * which codecs supply one, so a twin can neither drop a message users see today
 * nor invent one they don't.
 */
describe('custom failure messages', () => {
  it.each([
    {
      label: 'NameSpaceString',
      ioTs: NameSpaceString,
      zod: zodCommon.NameSpaceString,
      input: 'Not A Namespace',
    },
    {
      label: 'getNonEmptyStringCodec',
      ioTs: getNonEmptyStringCodec('host'),
      zod: zodCommon.getNonEmptyStringCodec('host'),
      input: '   ',
    },
    {
      label: 'InlineScriptString',
      ioTs: InlineScriptString,
      zod: zodCommon.InlineScriptString,
      input: 'journey("a journey", () => {})',
    },
  ])('$label: the zod twin reproduces the io-ts message verbatim', ({ ioTs, zod, input }) => {
    const expected = ioTsCustomMessages(ioTs, input);
    expect(expected).not.toHaveLength(0);
    expect(zodMessages(zod, input)).toEqual(expected);
  });

  // These two report through the field key instead, so inventing a message for
  // the twin would silently change what users see. Reproducing the key-derived
  // text is the job of the shared zod error formatter in a later phase.
  it.each([
    { label: 'TimeoutString', ioTs: TimeoutString, input: 'not-a-number' },
    { label: 'NonEmptyString', ioTs: NonEmptyString, input: '   ' },
  ])('$label: io-ts supplies no custom message', ({ ioTs, input }) => {
    expect(ioTsCustomMessages(ioTs, input)).toEqual([]);
  });
});
