/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Accept/reject coverage for the hand-written scalar codecs (namespace, timeout,
 * non-empty string, inline script) whose rules live in refine/superRefine rather
 * than a plain wire type.
 */

import { z } from '@kbn/zod';
import { decode } from './test_helpers/codec_agnostic';
import { asCases } from './test_helpers/codec_cases';
import {
  getNonEmptyStringCodec,
  InlineScriptString,
  NameSpaceString,
  NonEmptyString,
  nonEmptyArray,
  TimeoutString,
} from './zod/common';
import {
  inlineScriptIsFullJourneyMessage,
  nonEmptyFieldMessage,
} from './validation_messages';

const namespaceCorpus = {
  valid: ['default', 'testnamespace'],
  invalid: ['With Space And Upper', 'a'.repeat(300), 42, null, undefined, {}],
};

describe('NameSpaceString', () => {
  it.each(namespaceCorpus.valid)('accepts valid namespace %p', (input) => {
    expect(decode(NameSpaceString, input).success).toBe(true);
  });

  it.each(namespaceCorpus.invalid)('rejects invalid namespace %p', (input) => {
    expect(decode(NameSpaceString, input).success).toBe(false);
  });
});

const timeoutCorpus = {
  valid: ['16', '1.5', '0'],
  invalid: ['', '   ', 'abc', 16, null, undefined],
};

describe('TimeoutString', () => {
  it.each(timeoutCorpus.valid)('accepts numeric string %p', (input) => {
    expect(decode(TimeoutString, input).success).toBe(true);
  });

  // `'   '` must be rejected by the trim check before the numeric check,
  // since `Number('   ')` is 0 rather than NaN.
  it.each(timeoutCorpus.invalid)('rejects %p', (input) => {
    expect(decode(TimeoutString, input).success).toBe(false);
  });
});

const nonEmptyFieldCorpus = { valid: ['localhost', 'a'], invalid: ['', '   ', 42, null] };

describe('getNonEmptyStringCodec', () => {
  const codec = getNonEmptyStringCodec('host');

  it.each(nonEmptyFieldCorpus.valid)('accepts non-empty string %p', (input) => {
    expect(decode(codec, input).success).toBe(true);
  });

  // Whitespace-only is rejected because the codec trims — `z.string().min(1)`
  // would not be equivalent here.
  it.each(nonEmptyFieldCorpus.invalid)('rejects %p', (input) => {
    expect(decode(codec, input).success).toBe(false);
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

describe('InlineScriptString', () => {
  it.each(inlineScriptCorpus.valid)('accepts %p', (input) => {
    expect(decode(InlineScriptString, input).success).toBe(true);
  });

  it.each(inlineScriptCorpus.invalid)('rejects %p', (input) => {
    expect(decode(InlineScriptString, input).success).toBe(false);
  });
});

const nonEmptyStringCorpus = { valid: ['x', 'value'], invalid: ['', '   ', 42, null, undefined] };

describe('NonEmptyString', () => {
  it.each(nonEmptyStringCorpus.valid)('accepts %p', (input) => {
    expect(decode(NonEmptyString, input).success).toBe(true);
  });

  it.each(nonEmptyStringCorpus.invalid)('rejects %p', (input) => {
    expect(decode(NonEmptyString, input).success).toBe(false);
  });
});

const nonEmptyArrayCorpus = {
  valid: [['a'], ['a', 'b']],
  invalid: [[], 'not an array', null, undefined, {}, [1], [null], ['a', 2]],
};

describe('nonEmptyArray', () => {
  const codec = nonEmptyArray(z.string());

  it.each(asCases(nonEmptyArrayCorpus.valid))('accepts %p', (input) => {
    expect(decode(codec, input).success).toBe(true);
  });

  it.each(asCases(nonEmptyArrayCorpus.invalid))('rejects %p', (input) => {
    expect(decode(codec, input).success).toBe(false);
  });
});

const nonEmptyArrayOfNonEmptyStringCorpus = {
  valid: [['a'], ['a', 'b']],
  invalid: [[], ['   '], ['a', ''], [42]],
};

describe('nonEmptyArray of NonEmptyString', () => {
  const codec = nonEmptyArray(NonEmptyString);

  it.each(asCases(nonEmptyArrayOfNonEmptyStringCorpus.valid))('accepts %p', (input) => {
    expect(decode(codec, input).success).toBe(true);
  });

  it.each(asCases(nonEmptyArrayOfNonEmptyStringCorpus.invalid))('rejects %p', (input) => {
    expect(decode(codec, input).success).toBe(false);
  });
});

describe('custom failure messages', () => {
  it('NameSpaceString includes the Fleet error text', () => {
    const result = NameSpaceString.safeParse('Not A Namespace');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/^Invalid namespace:/);
    }
  });

  it('getNonEmptyStringCodec includes the field name', () => {
    const result = getNonEmptyStringCodec('host').safeParse('   ');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(nonEmptyFieldMessage('host'));
    }
  });

  it('InlineScriptString rejects a full journey with the journey message', () => {
    const result = InlineScriptString.safeParse('journey("a journey", () => {})');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(inlineScriptIsFullJourneyMessage());
    }
  });
});
