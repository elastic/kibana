/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SchemaOutput } from '../schema_output';

export enum MonitorTypeEnum {
  HTTP = 'http',
  TCP = 'tcp',
  ICMP = 'icmp',
  BROWSER = 'browser',
  API = 'api',
}

export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
}

export enum ResponseBodyIndexPolicy {
  ALWAYS = 'always',
  NEVER = 'never',
  ON_ERROR = 'on_error',
}

export enum MonacoEditorLangId {
  JSON = 'xjson',
  PLAINTEXT = 'plaintext',
  XML = 'xml',
  JAVASCRIPT = 'javascript',
}

export enum CodeEditorMode {
  FORM = 'form',
  JSON = 'json',
  PLAINTEXT = 'text',
  XML = 'xml',
}

export enum ContentType {
  JSON = 'application/json',
  TEXT = 'text/plain',
  XML = 'application/xml',
  FORM = 'application/x-www-form-urlencoded',
}

export enum ScheduleUnit {
  MINUTES = 'm',
  SECONDS = 's',
}

export enum VerificationMode {
  CERTIFICATE = 'certificate',
  FULL = 'full',
  NONE = 'none',
  STRICT = 'strict',
}

export enum TLSVersion {
  ONE_ZERO = 'TLSv1.0',
  ONE_ONE = 'TLSv1.1',
  ONE_TWO = 'TLSv1.2',
  ONE_THREE = 'TLSv1.3',
}

export enum ScreenshotOption {
  ON = 'on',
  OFF = 'off',
  ONLY_ON_FAILURE = 'only-on-failure',
}

export enum SourceType {
  UI = 'ui',
  PROJECT = 'project',
}

export enum FormMonitorType {
  SINGLE = 'single',
  MULTISTEP = 'multistep',
  API = 'api',
  HTTP = 'http',
  TCP = 'tcp',
  ICMP = 'icmp',
}

export enum Mode {
  ANY = 'any',
  ALL = 'all',
}

// UI-only selector value used by the HTTP monitor form to switch between the
// mutually exclusive authentication schemes. Not persisted directly; the
// underlying `kerberos.enabled` / `ntlm.enabled` flags (and basic auth
// username/password) are the source of truth.
export enum HttpAuthMethod {
  NONE = 'none',
  BASIC = 'basic',
  KERBEROS = 'kerberos',
  NTLM = 'ntlm',
}

// Mirrors the libbeat Kerberos client `auth_type` option used by Heartbeat.
export enum KerberosAuthType {
  PASSWORD = 'password',
  KEYTAB = 'keytab',
}

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

export const KerberosConfigCodec = z.looseObject({
  enabled: z.boolean(),
  auth_type: KerberosAuthTypeCodec,
  username: z.string(),
  password: z.string(),
  keytab: z.string(),
  // Exactly one of config_path / krb5_conf is required when enabled (Heartbeat).
  config_path: z.string(),
  krb5_conf: z.string(),
  realm: z.string(),
  service_name: z.string(),
  enable_krb5_fast: z.boolean(),
});

export const NtlmConfigCodec = z.looseObject({
  enabled: z.boolean(),
  username: z.string(),
  password: z.string(),
  domain: z.string(),
  workstation: z.string(),
});

export const ResponseCheckJSONCodec = z.looseObject({
  description: z.string(),
  expression: z.string(),
});

export const RequestBodyCheckCodec = z.looseObject({
  value: z.string(),
  type: CodeEditorModeCodec,
});

export type KerberosConfig = SchemaOutput<typeof KerberosConfigCodec>;
export type NtlmConfig = SchemaOutput<typeof NtlmConfigCodec>;
export type ResponseCheckJSON = SchemaOutput<typeof ResponseCheckJSONCodec>;
export type RequestBodyCheck = SchemaOutput<typeof RequestBodyCheckCodec>;
