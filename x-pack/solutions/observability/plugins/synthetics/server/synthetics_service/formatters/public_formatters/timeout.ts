/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey, MonitorTypeEnum } from '../../../../common/runtime_types';
import { secondsToCronFormatter } from '../formatting_utils';
import type { Formatter } from './common';

export const publicTimeoutFormatter: Formatter = (fields, key) => {
  if (fields[ConfigKey.MONITOR_TYPE] === MonitorTypeEnum.BROWSER) {
    return null;
  }

  return secondsToCronFormatter(fields, key);
};
