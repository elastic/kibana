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
import type { Formatter } from './common';
import { commonFormatters } from './common';
import { tlsFormatters } from './tls';
import { arrayFormatter, objectFormatter, omitDefaultFormatter } from './formatting_utils';

export type HTTPFormatMap = Record<keyof HTTPFields, Formatter>;

// These defaults match Heartbeat's own defaults, so omitting them leaves
// monitor behavior unchanged (elastic/kibana#241818).
export const httpFormatters: HTTPFormatMap = {
  ...tlsFormatters,
  ...commonFormatters,
  [ConfigKey.MAX_REDIRECTS]: omitDefaultFormatter('0'),
  [ConfigKey.REQUEST_METHOD_CHECK]: omitDefaultFormatter(HTTPMethod.GET),
  [ConfigKey.RESPONSE_BODY_INDEX]: omitDefaultFormatter(ResponseBodyIndexPolicy.ON_ERROR),
  [ConfigKey.MODE]: omitDefaultFormatter(Mode.ANY),
  [ConfigKey.RESPONSE_HEADERS_INDEX]: null,
  [ConfigKey.URLS]: null,
  [ConfigKey.USERNAME]: null,
  [ConfigKey.PASSWORD]: null,
  [ConfigKey.PROXY_URL]: null,
  [ConfigKey.PORT]: null,
  [ConfigKey.REQUEST_BODY_CHECK]: (fields) =>
    fields[ConfigKey.REQUEST_BODY_CHECK]?.value
      ? JSON.stringify(fields[ConfigKey.REQUEST_BODY_CHECK]?.value)
      : null,
  [ConfigKey.RESPONSE_BODY_MAX_BYTES]: null,
  // ipv4/ipv6 default to true but can be explicitly set to false, so they are
  // intentionally still emitted (an omit-on-default would drop a real `false`).
  [ConfigKey.IPV4]: null,
  [ConfigKey.IPV6]: null,
  [ConfigKey.METADATA]: objectFormatter,
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: arrayFormatter,
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: arrayFormatter,
  [ConfigKey.RESPONSE_JSON_CHECK]: arrayFormatter,
  [ConfigKey.RESPONSE_HEADERS_CHECK]: objectFormatter,
  [ConfigKey.RESPONSE_STATUS_CHECK]: arrayFormatter,
  [ConfigKey.REQUEST_HEADERS_CHECK]: objectFormatter,
  // @ts-expect-error upgrade typescript v5.1.6
  [ConfigKey.REQUEST_BODY_CHECK]: (fields) => fields[ConfigKey.REQUEST_BODY_CHECK]?.value || null,
  [ConfigKey.PROXY_HEADERS]: objectFormatter,
};
