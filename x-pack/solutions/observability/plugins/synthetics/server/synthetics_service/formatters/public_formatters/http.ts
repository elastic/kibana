/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey, HTTPFields } from '../../../../common/runtime_types';
import { Formatter, commonFormatters } from './common';
import { tlsFormatters } from './tls';
import { arrayFormatter, objectFormatter } from './formatting_utils';

export type HTTPFormatMap = Record<keyof HTTPFields, Formatter>;
export const httpFormatters: HTTPFormatMap = {
  ...tlsFormatters,
  ...commonFormatters,
  [ConfigKey.MAX_REDIRECTS]: null,
  [ConfigKey.REQUEST_METHOD_CHECK]: null,
  [ConfigKey.RESPONSE_BODY_INDEX]: null,
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
  [ConfigKey.MODE]: null,
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
