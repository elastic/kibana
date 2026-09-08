/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Characterization tests pinning the current io-ts behavior of the enum codecs
 * built with the `tEnum` helper, before the zod migration. They document the
 * accepted value set and that decode is identity for a valid value, so the zod
 * `z.nativeEnum`/`z.enum` twins can be proven equivalent.
 */

import type * as t from 'io-ts';
import { decode, type DecodeOutcome } from '../test_helpers/codec_agnostic';
import { MonitorTypeCodec, ScheduleUnitCodec, VerificationModeCodec } from './monitor_configs';

interface CodecUnderTest<A> {
  flavor: 'io-ts' | 'zod';
  decode: (input: unknown) => DecodeOutcome<A>;
}

const ioTsCodec = <A, O>(codec: t.Type<A, O, unknown>): CodecUnderTest<A> => ({
  flavor: 'io-ts',
  decode: (input) => decode(codec, input),
});

describe.each([ioTsCodec(MonitorTypeCodec)])('MonitorTypeCodec ($flavor)', (codec) => {
  it.each(['http', 'tcp', 'icmp', 'browser'])('accepts %p as an identity decode', (input) => {
    const result = codec.decode(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe(input);
    }
  });

  it.each(['HTTP', 'unknown', '', 42, null, undefined])('rejects %p', (input) => {
    expect(codec.decode(input).success).toBe(false);
  });
});

describe.each([ioTsCodec(ScheduleUnitCodec)])('ScheduleUnitCodec ($flavor)', (codec) => {
  it.each(['m', 's'])('accepts %p', (input) => {
    expect(codec.decode(input).success).toBe(true);
  });

  it.each(['h', 'minutes', 1, null])('rejects %p', (input) => {
    expect(codec.decode(input).success).toBe(false);
  });
});

describe.each([ioTsCodec(VerificationModeCodec)])('VerificationModeCodec ($flavor)', (codec) => {
  it.each(['certificate', 'full', 'none', 'strict'])('accepts %p', (input) => {
    expect(codec.decode(input).success).toBe(true);
  });

  it.each(['partial', '', null])('rejects %p', (input) => {
    expect(codec.decode(input).success).toBe(false);
  });
});
