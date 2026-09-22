/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Characterization tests for the enum codecs, run against both the io-ts
 * `tEnum` originals and their zod `z.enum` twins.
 *
 * The accepted value set is derived from each TypeScript enum rather than
 * hand-listed, so adding a member to an enum automatically extends the
 * contract instead of silently going untested. Decode must be identity for a
 * valid value.
 */

import type { z } from '@kbn/zod';
import type * as t from 'io-ts';
import { decode, type DecodeOutcome } from '../test_helpers/codec_agnostic';
import { expectSameOutcome } from '../test_helpers/parity';
import {
  CodeEditorMode,
  CodeEditorModeCodec,
  FormMonitorType,
  FormMonitorTypeCodec,
  Mode,
  ModeCodec,
  MonitorTypeCodec,
  MonitorTypeEnum,
  RequestBodyCheckCodec,
  ResponseBodyIndexPolicy,
  ResponseBodyIndexPolicyCodec,
  ResponseCheckJSONCodec,
  ScheduleUnit,
  ScheduleUnitCodec,
  ScreenshotOption,
  ScreenshotOptionCodec,
  SourceType,
  SourceTypeCodec,
  TLSVersion,
  TLSVersionCodec,
  VerificationMode,
  VerificationModeCodec,
} from './monitor_configs';
import * as zodConfigs from '../zod/monitor_configs';

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

/** Values no enum should ever accept, exercised against every codec. */
const universallyInvalid: unknown[] = ['', 'definitely-not-a-member', 42, null, undefined, {}, []];

/**
 * Wraps each input in an args tuple. `it.each` treats a bare array case as the
 * argument list itself, so the `[]` entry above would otherwise run the test
 * with no arguments and silently assert against `undefined`.
 */
const asCases = (inputs: unknown[]) => inputs.map((input) => [input]);

interface EnumCase {
  label: string;
  ioTs: t.Mixed;
  zod: z.ZodType;
  values: string[];
}

const enumCases: EnumCase[] = [
  {
    label: 'MonitorTypeCodec',
    ioTs: MonitorTypeCodec,
    zod: zodConfigs.MonitorTypeCodec,
    values: Object.values(MonitorTypeEnum),
  },
  {
    label: 'ResponseBodyIndexPolicyCodec',
    ioTs: ResponseBodyIndexPolicyCodec,
    zod: zodConfigs.ResponseBodyIndexPolicyCodec,
    values: Object.values(ResponseBodyIndexPolicy),
  },
  {
    label: 'CodeEditorModeCodec',
    ioTs: CodeEditorModeCodec,
    zod: zodConfigs.CodeEditorModeCodec,
    values: Object.values(CodeEditorMode),
  },
  {
    label: 'ScheduleUnitCodec',
    ioTs: ScheduleUnitCodec,
    zod: zodConfigs.ScheduleUnitCodec,
    values: Object.values(ScheduleUnit),
  },
  {
    label: 'VerificationModeCodec',
    ioTs: VerificationModeCodec,
    zod: zodConfigs.VerificationModeCodec,
    values: Object.values(VerificationMode),
  },
  {
    label: 'TLSVersionCodec',
    ioTs: TLSVersionCodec,
    zod: zodConfigs.TLSVersionCodec,
    values: Object.values(TLSVersion),
  },
  {
    label: 'ScreenshotOptionCodec',
    ioTs: ScreenshotOptionCodec,
    zod: zodConfigs.ScreenshotOptionCodec,
    values: Object.values(ScreenshotOption),
  },
  {
    label: 'SourceTypeCodec',
    ioTs: SourceTypeCodec,
    zod: zodConfigs.SourceTypeCodec,
    values: Object.values(SourceType),
  },
  {
    label: 'FormMonitorTypeCodec',
    ioTs: FormMonitorTypeCodec,
    zod: zodConfigs.FormMonitorTypeCodec,
    values: Object.values(FormMonitorType),
  },
  {
    label: 'ModeCodec',
    ioTs: ModeCodec,
    zod: zodConfigs.ModeCodec,
    values: Object.values(Mode),
  },
];

describe.each(enumCases)('$label', ({ ioTs, zod, values }) => {
  describe.each([ioTsCodec(ioTs), zodCodec(zod)])('$flavor', (codec) => {
    it.each(values)('accepts %p as an identity decode', (input) => {
      const result = codec.decode(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(input);
      }
    });

    it.each(asCases(universallyInvalid))('rejects %p', (input) => {
      expect(codec.decode(input).success).toBe(false);
    });

    // Enum matching is case-sensitive.
    it.each(values)('rejects the upper-cased form of %p', (input) => {
      const upper = input.toUpperCase();
      if (upper !== input) {
        expect(codec.decode(upper).success).toBe(false);
      }
    });
  });

  it.each(asCases([...values, ...universallyInvalid]))('io-ts and zod agree on %p', (input) => {
    expectSameOutcome(ioTs, zod, input);
  });
});

/**
 * The two object codecs built on top of the enums. Both are `t.interface`, so
 * they keep unknown keys — the extra-key entries below are what force the zod
 * twins to be `looseObject` rather than the stripping default.
 */
interface ObjectCodecCase {
  label: string;
  ioTs: t.Mixed;
  zod: z.ZodType;
  corpus: unknown[];
}

describe.each<ObjectCodecCase>([
  {
    label: 'ResponseCheckJSONCodec',
    ioTs: ResponseCheckJSONCodec,
    zod: zodConfigs.ResponseCheckJSONCodec,
    corpus: [
      { description: 'body is ok', expression: '$.ok == true' },
      { description: 'extra keys survive', expression: '$.ok', extraKey: 'kept' },
      { description: 'missing expression' },
      { expression: '$.ok' },
      'not an object',
      null,
    ],
  },
  {
    label: 'RequestBodyCheckCodec',
    ioTs: RequestBodyCheckCodec,
    zod: zodConfigs.RequestBodyCheckCodec,
    corpus: [
      { value: '{"a":1}', type: CodeEditorMode.JSON },
      { value: '{"a":1}', type: CodeEditorMode.JSON, extraKey: 'kept' },
      { value: '{}', type: 'yaml' },
      { value: 42, type: CodeEditorMode.JSON },
      null,
    ],
  },
])('$label io-ts/zod parity', ({ ioTs, zod, corpus }) => {
  it.each(asCases(corpus))('agrees on %p', (input) => {
    expectSameOutcome(ioTs, zod, input);
  });
});
