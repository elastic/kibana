/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Accept/reject coverage for the enum codecs. The accepted value set is derived
 * from each TypeScript enum rather than hand-listed, so adding a member
 * automatically extends the contract. Decode must be identity for a valid value.
 */

import type { z } from '@kbn/zod';
import { decode } from '../test_helpers/codec_agnostic';
import { asCases, describeCodecCases } from '../test_helpers/codec_cases';
import {
  CodeEditorMode,
  CodeEditorModeCodec,
  FormMonitorType,
  FormMonitorTypeCodec,
  KerberosAuthType,
  KerberosAuthTypeCodec,
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

/** Values no enum should ever accept, exercised against every codec. */
const universallyInvalid: unknown[] = ['', 'definitely-not-a-member', 42, null, undefined, {}, []];

interface EnumCase {
  label: string;
  codec: z.ZodType;
  values: string[];
}

const enumCases: EnumCase[] = [
  {
    label: 'MonitorTypeCodec',
    codec: MonitorTypeCodec,
    values: Object.values(MonitorTypeEnum),
  },
  {
    label: 'ResponseBodyIndexPolicyCodec',
    codec: ResponseBodyIndexPolicyCodec,
    values: Object.values(ResponseBodyIndexPolicy),
  },
  {
    label: 'CodeEditorModeCodec',
    codec: CodeEditorModeCodec,
    values: Object.values(CodeEditorMode),
  },
  {
    label: 'ScheduleUnitCodec',
    codec: ScheduleUnitCodec,
    values: Object.values(ScheduleUnit),
  },
  {
    label: 'VerificationModeCodec',
    codec: VerificationModeCodec,
    values: Object.values(VerificationMode),
  },
  {
    label: 'TLSVersionCodec',
    codec: TLSVersionCodec,
    values: Object.values(TLSVersion),
  },
  {
    label: 'ScreenshotOptionCodec',
    codec: ScreenshotOptionCodec,
    values: Object.values(ScreenshotOption),
  },
  {
    label: 'SourceTypeCodec',
    codec: SourceTypeCodec,
    values: Object.values(SourceType),
  },
  {
    label: 'FormMonitorTypeCodec',
    codec: FormMonitorTypeCodec,
    values: Object.values(FormMonitorType),
  },
  {
    label: 'ModeCodec',
    codec: ModeCodec,
    values: Object.values(Mode),
  },
  {
    label: 'KerberosAuthTypeCodec',
    codec: KerberosAuthTypeCodec,
    values: Object.values(KerberosAuthType),
  },
];

describe.each(enumCases)('$label', ({ codec, values }) => {
  it.each(values)('accepts %p as an identity decode', (input) => {
    const result = decode(codec, input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe(input);
    }
  });

  it.each(asCases(universallyInvalid))('rejects %p', (input) => {
    expect(decode(codec, input).success).toBe(false);
  });

  // Enum matching is case-sensitive.
  it.each(values)('rejects the upper-cased form of %p', (input) => {
    const upper = input.toUpperCase();
    if (upper !== input) {
      expect(decode(codec, upper).success).toBe(false);
    }
  });
});

describeCodecCases({
  label: 'ResponseCheckJSONCodec',
  codec: ResponseCheckJSONCodec,
  valid: [
    { description: 'body is ok', expression: '$.ok == true' },
    { description: 'extra keys survive', expression: '$.ok', extraKey: 'kept' },
  ],
  invalid: [{ description: 'missing expression' }, { expression: '$.ok' }, 'not an object', null],
});

describeCodecCases({
  label: 'RequestBodyCheckCodec',
  codec: RequestBodyCheckCodec,
  valid: [
    { value: '{"a":1}', type: CodeEditorMode.JSON },
    { value: '{"a":1}', type: CodeEditorMode.JSON, extraKey: 'kept' },
  ],
  invalid: [{ value: '{}', type: 'yaml' }, { value: 42, type: CodeEditorMode.JSON }, null],
});
