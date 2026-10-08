/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';
import {
  CodeEditorMode,
  FormMonitorType,
  KerberosAuthType,
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
export const KerberosAuthTypeCodec = z.enum(KerberosAuthType);

// Bounds limit request/policy amplification for nested auth payloads.
const AUTH_STRING_MAX = 4096;
const AUTH_INLINE_CONF_MAX = 131072; // krb5.conf / keytab content
const authString = () => z.string().max(AUTH_STRING_MAX);
const authInlineConf = () => z.string().max(AUTH_INLINE_CONF_MAX);

// strictObject: reject unknown keys so size-bounded declared strings cannot be
// bypassed via an oversized extra property on the auth block.
export const KerberosConfigCodec = lazySchema(() =>
  z.strictObject({
    enabled: z.boolean(),
    auth_type: KerberosAuthTypeCodec,
    username: authString(),
    password: authString(),
    keytab: authInlineConf(),
    // Exactly one of config_path / krb5_conf is required when enabled (Heartbeat).
    config_path: authString(),
    krb5_conf: authInlineConf(),
    realm: authString(),
    service_name: authString(),
    enable_krb5_fast: z.boolean(),
  })
);

export const NtlmConfigCodec = lazySchema(() =>
  z.strictObject({
    enabled: z.boolean(),
    username: authString(),
    password: authString(),
    domain: authString(),
    workstation: authString(),
  })
);

export const ResponseCheckJSONCodec = lazySchema(() =>
  z.looseObject({
    description: z.string(),
    expression: z.string(),
  })
);

export const RequestBodyCheckCodec = lazySchema(() =>
  z.looseObject({
    value: z.string(),
    type: CodeEditorModeCodec,
  })
);
