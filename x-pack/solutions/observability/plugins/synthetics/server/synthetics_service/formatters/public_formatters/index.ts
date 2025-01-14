/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpFormatters, type HTTPFormatMap } from './http';
import { tcpFormatters, type TCPFormatMap } from './tcp';
import { icmpFormatters, type ICMPFormatMap } from './icmp';
import { browserFormatters, type BrowserFormatMap } from './browser';
import { commonFormatters, type CommonFormatMap } from './common';

type Formatters = HTTPFormatMap & TCPFormatMap & ICMPFormatMap & BrowserFormatMap & CommonFormatMap;

export const publicFormatters: Formatters = {
  ...httpFormatters,
  ...icmpFormatters,
  ...tcpFormatters,
  ...browserFormatters,
  ...commonFormatters,
};
