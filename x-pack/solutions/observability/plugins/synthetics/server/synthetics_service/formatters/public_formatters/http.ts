/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HTTPFields } from '../../../../common/runtime_types';
import { ConfigKey } from '../../../../common/runtime_types';
import type { Formatter } from './common';
import { commonFormatters } from './common';
import { tlsFormatters } from './tls';
import { arrayFormatter, objectFormatter } from './formatting_utils';

export type HTTPFormatMap = Record<keyof HTTPFields, Formatter>;

// Only emit the Kerberos / NTLM blocks when the respective scheme is enabled so
// disabled monitors don't ship empty auth config to Heartbeat.
const kerberosFormatter: Formatter = (fields, key) =>
  fields[ConfigKey.KERBEROS_ENABLED] ? (fields[key] as string | boolean) ?? null : null;
const ntlmFormatter: Formatter = (fields, key) =>
  fields[ConfigKey.NTLM_ENABLED] ? (fields[key] as string | boolean) ?? null : null;

export const httpFormatters: HTTPFormatMap = {
  ...tlsFormatters,
  ...commonFormatters,
  [ConfigKey.KERBEROS_ENABLED]: kerberosFormatter,
  [ConfigKey.KERBEROS_AUTH_TYPE]: kerberosFormatter,
  [ConfigKey.KERBEROS_USERNAME]: kerberosFormatter,
  [ConfigKey.KERBEROS_PASSWORD]: kerberosFormatter,
  [ConfigKey.KERBEROS_KEYTAB]: kerberosFormatter,
  [ConfigKey.KERBEROS_CONFIG_PATH]: kerberosFormatter,
  [ConfigKey.KERBEROS_REALM]: kerberosFormatter,
  [ConfigKey.KERBEROS_SERVICE_NAME]: kerberosFormatter,
  [ConfigKey.NTLM_ENABLED]: ntlmFormatter,
  [ConfigKey.NTLM_USERNAME]: ntlmFormatter,
  [ConfigKey.NTLM_PASSWORD]: ntlmFormatter,
  [ConfigKey.NTLM_DOMAIN]: ntlmFormatter,
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
