/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HTTPFields } from '../../../../common/runtime_types';
import {
  ConfigKey,
  HTTPMethod,
  Mode,
  ResponseBodyIndexPolicy,
} from '../../../../common/runtime_types';
import { tlsFormatters } from './tls_formatters';

import type { Formatter } from './common_formatters';
import { commonFormatters } from './common_formatters';
import {
  stringToJsonFormatter,
  arrayToJsonFormatter,
  objectToJsonFormatter,
  omitDefaultFormatter,
  omitFieldFormatter,
} from './formatting_utils';

export type HTTPFormatMap = Record<keyof HTTPFields, Formatter>;

// These defaults match Heartbeat's own defaults (heartbeat/monitors/active/http/config.go),
// so omitting them from the policy leaves monitor behavior unchanged (elastic/kibana#241818).
export const httpFormatters: HTTPFormatMap = {
  ...commonFormatters,
  ...tlsFormatters,
  [ConfigKey.MAX_REDIRECTS]: omitDefaultFormatter('0'),
  [ConfigKey.REQUEST_METHOD_CHECK]: omitDefaultFormatter(HTTPMethod.GET),
  [ConfigKey.RESPONSE_BODY_INDEX]: omitDefaultFormatter(ResponseBodyIndexPolicy.ON_ERROR),
  [ConfigKey.MODE]: omitDefaultFormatter(Mode.ANY),
  [ConfigKey.RESPONSE_HEADERS_INDEX]: null,
  // __ui is UI-only metadata that Heartbeat ignores; drop it from the policy.
  [ConfigKey.METADATA]: omitFieldFormatter,
  [ConfigKey.URLS]: stringToJsonFormatter,
  [ConfigKey.USERNAME]: stringToJsonFormatter,
  [ConfigKey.PASSWORD]: stringToJsonFormatter,
  [ConfigKey.PROXY_URL]: stringToJsonFormatter,
  [ConfigKey.PROXY_HEADERS]: objectToJsonFormatter,
  [ConfigKey.PORT]: stringToJsonFormatter,
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: arrayToJsonFormatter,
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: arrayToJsonFormatter,
  [ConfigKey.RESPONSE_JSON_CHECK]: arrayToJsonFormatter,
  [ConfigKey.RESPONSE_HEADERS_CHECK]: objectToJsonFormatter,
  [ConfigKey.RESPONSE_STATUS_CHECK]: arrayToJsonFormatter,
  [ConfigKey.REQUEST_HEADERS_CHECK]: objectToJsonFormatter,
  [ConfigKey.REQUEST_BODY_CHECK]: (fields) =>
    fields[ConfigKey.REQUEST_BODY_CHECK]?.value
      ? JSON.stringify(fields[ConfigKey.REQUEST_BODY_CHECK]?.value)
      : null,
  [ConfigKey.RESPONSE_BODY_MAX_BYTES]: null,
  // ipv4/ipv6 default to true; a `{{#if}}` guard can't distinguish an explicit
  // `false` from an omitted value, so they are intentionally still emitted.
  [ConfigKey.IPV4]: null,
  [ConfigKey.IPV6]: null,
};
