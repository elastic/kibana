/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * zod twins of the `tEnum`-built codecs in `../monitor_management/monitor_configs.ts`.
 *
 * `tEnum` accepts any value present in `Object.values(theEnum)` and decodes it
 * as identity; zod v4's `z.enum()` takes a TypeScript enum directly and behaves
 * the same way, so these are one-liners. Only the error text differs, which the
 * parity suite records.
 */

import { z } from '@kbn/zod';
import {
  CodeEditorMode,
  FormMonitorType,
  Mode,
  MonitorTypeEnum,
  ResponseBodyIndexPolicy,
  ScheduleUnit,
  ScreenshotOption,
  SourceType,
  TLSVersion,
  VerificationMode,
} from '../monitor_management/monitor_configs';

export const MonitorTypeCodec = z.enum(MonitorTypeEnum);
export const ResponseBodyIndexPolicyCodec = z.enum(ResponseBodyIndexPolicy);
export const CodeEditorModeCodec = z.enum(CodeEditorMode);
export const ScheduleUnitCodec = z.enum(ScheduleUnit);
export const VerificationModeCodec = z.enum(VerificationMode);
export const TLSVersionCodec = z.enum(TLSVersion);
export const ScreenshotOptionCodec = z.enum(ScreenshotOption);
export const SourceTypeCodec = z.enum(SourceType);
export const FormMonitorTypeCodec = z.enum(FormMonitorType);
export const ModeCodec = z.enum(Mode);

/**
 * These two are `t.interface`, which keeps unknown keys, and the `t.exact`
 * applied to monitor payloads only strips at the top level — so extra keys
 * inside them survive today. `z.looseObject` reproduces that; a plain
 * `z.object` would strip them and silently drop data.
 */
export const ResponseCheckJSONCodec = z.looseObject({
  description: z.string(),
  expression: z.string(),
});

export const RequestBodyCheckCodec = z.looseObject({
  value: z.string(),
  type: CodeEditorModeCodec,
});
