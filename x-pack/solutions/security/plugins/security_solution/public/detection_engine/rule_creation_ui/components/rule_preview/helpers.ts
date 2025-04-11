/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectOption } from '@elastic/eui';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import * as i18n from './translations';

import type { TimeframePreviewOptions } from '../../../common/types';

/**
 * Determines whether or not to display noise warning.
 * Is considered noisy if alerts/hour rate > 1
 * @param hits Total query search hits
 * @param timeframe Range selected by user (last hour, day...)
 */
export const isNoisy = (hits: number, timeframe: TimeframePreviewOptions): boolean => {
  const oneHour = 1000 * 60 * 60;
  const durationInHours = Math.max(
    (timeframe.timeframeEnd.valueOf() - timeframe.timeframeStart.valueOf()) / oneHour,
    1.0
  );
  return hits / durationInHours > 1;
};

/**
 * Determines what timerange options to show.
 * Eql sequence queries tend to be slower, so decided
 * not to include the last month option.
 * @param ruleType
 */
export const getTimeframeOptions = (ruleType: Type): EuiSelectOption[] => {
  if (ruleType === 'eql') {
    return [
      { value: 'h', text: i18n.LAST_HOUR },
      { value: 'd', text: i18n.LAST_DAY },
    ];
  } else if (ruleType === 'threat_match') {
    return [
      { value: 'h', text: i18n.LAST_HOUR },
      { value: 'd', text: i18n.LAST_DAY },
      { value: 'w', text: i18n.LAST_WEEK },
    ];
  } else if (ruleType === 'threshold') {
    return [{ value: 'h', text: i18n.LAST_HOUR }];
  } else {
    return [
      { value: 'h', text: i18n.LAST_HOUR },
      { value: 'd', text: i18n.LAST_DAY },
      { value: 'M', text: i18n.LAST_MONTH },
    ];
  }
};
