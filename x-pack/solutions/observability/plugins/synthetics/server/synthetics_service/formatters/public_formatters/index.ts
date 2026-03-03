/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HTTPFormatMap } from './http';
import { httpFormatters } from './http';
import type { TCPFormatMap } from './tcp';
import { tcpFormatters } from './tcp';
import type { ICMPFormatMap } from './icmp';
import { icmpFormatters } from './icmp';
import type { BrowserFormatMap } from './browser';
import { browserFormatters } from './browser';
import type { CommonFormatMap } from './common';
import { commonFormatters } from './common';

type Formatters = HTTPFormatMap & TCPFormatMap & ICMPFormatMap & BrowserFormatMap & CommonFormatMap;

export const publicFormatters: Formatters = {
  ...httpFormatters,
  ...icmpFormatters,
  ...tcpFormatters,
  ...browserFormatters,
  ...commonFormatters,
};
