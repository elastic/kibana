/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ICMPFields } from '../../../../common/runtime_types';
import { ConfigKey } from '../../../../common/runtime_types';
import { secondsToCronFormatter } from './formatting_utils';

import type { Formatter } from './common_formatters';
import { commonFormatters } from './common_formatters';
import { stringToJsonFormatter } from './formatting_utils';

export type ICMPFormatMap = Record<keyof ICMPFields, Formatter>;

export const icmpFormatters: ICMPFormatMap = {
  ...commonFormatters,
  [ConfigKey.HOSTS]: stringToJsonFormatter,
  [ConfigKey.WAIT]: secondsToCronFormatter,
  [ConfigKey.MODE]: null,
  [ConfigKey.IPV4]: null,
  [ConfigKey.IPV6]: null,
};
