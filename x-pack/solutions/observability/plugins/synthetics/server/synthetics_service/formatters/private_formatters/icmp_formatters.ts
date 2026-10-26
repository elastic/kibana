/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ICMPFields } from '../../../../common/runtime_types';
import { ConfigKey, Mode } from '../../../../common/runtime_types';
import { secondsToCronFormatter } from '../formatting_utils';

import type { Formatter } from './common_formatters';
import { commonFormatters } from './common_formatters';
import { stringToJsonFormatter, omitDefaultFormatter } from './formatting_utils';

export type ICMPFormatMap = Record<keyof ICMPFields, Formatter>;

// wait (1s) and mode (any) match Heartbeat's defaults (elastic/kibana#241818).
export const icmpFormatters: ICMPFormatMap = {
  ...commonFormatters,
  [ConfigKey.HOSTS]: stringToJsonFormatter,
  [ConfigKey.WAIT]: omitDefaultFormatter('1', secondsToCronFormatter),
  [ConfigKey.MODE]: omitDefaultFormatter(Mode.ANY),
  [ConfigKey.IPV4]: null,
  [ConfigKey.IPV6]: null,
};
