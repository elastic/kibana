/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TCPFields } from '../../../../common/runtime_types';
import { ConfigKey, Mode } from '../../../../common/runtime_types';
import type { Formatter } from './common';
import { commonFormatters } from './common';
import { tlsFormatters } from './tls';
import { omitDefaultFormatter } from './formatting_utils';

export type TCPFormatMap = Record<keyof TCPFields, Formatter>;
export const tcpFormatters: TCPFormatMap = {
  ...tlsFormatters,
  ...commonFormatters,
  [ConfigKey.HOSTS]: null,
  [ConfigKey.PROXY_USE_LOCAL_RESOLVER]: null,
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: null,
  [ConfigKey.REQUEST_SEND_CHECK]: null,
  [ConfigKey.PROXY_URL]: null,
  [ConfigKey.PORT]: null,
  [ConfigKey.URLS]: null,
  // 'any' matches Heartbeat's default (elastic/kibana#241818).
  [ConfigKey.MODE]: omitDefaultFormatter(Mode.ANY),
  [ConfigKey.IPV4]: null,
  [ConfigKey.IPV6]: null,
  [ConfigKey.METADATA]: null,
};
