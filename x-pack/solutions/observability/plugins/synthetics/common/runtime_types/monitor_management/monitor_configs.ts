/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import type {
  KerberosConfigCodec,
  NtlmConfigCodec,
  RequestBodyCheckCodec,
  ResponseCheckJSONCodec,
} from '../schemas/monitor_configs';

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

export type KerberosConfig = SchemaOutput<typeof KerberosConfigCodec>;
export type NtlmConfig = SchemaOutput<typeof NtlmConfigCodec>;
export type ResponseCheckJSON = SchemaOutput<typeof ResponseCheckJSONCodec>;
export type RequestBodyCheck = SchemaOutput<typeof RequestBodyCheckCodec>;
