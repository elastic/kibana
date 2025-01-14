/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type HTTPFormatMap, httpFormatters } from './http_formatters';
import { type TCPFormatMap, tcpFormatters } from './tcp_formatters';
import { type ICMPFormatMap, icmpFormatters } from './icmp_formatters';
import { type BrowserFormatMap, browserFormatters } from './browser_formatters';
import { type CommonFormatMap, commonFormatters } from './common_formatters';

type Formatters = HTTPFormatMap & TCPFormatMap & ICMPFormatMap & BrowserFormatMap & CommonFormatMap;

export const syntheticsPolicyFormatters: Formatters = {
  ...httpFormatters,
  ...icmpFormatters,
  ...tcpFormatters,
  ...browserFormatters,
  ...commonFormatters,
};
