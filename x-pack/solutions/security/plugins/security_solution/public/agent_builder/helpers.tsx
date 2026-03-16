/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';

import type { ChatCompleteAnonymizationTarget } from '@kbn/inference-common';
import { ESSENTIAL_ALERT_FIELDS } from '../../common';
import { DEFAULT_ALERT_DATA_VIEW_ID } from '../../common/constants';

export const getAlertDataViewAnonymizationTarget = (
  spaceId: string
): ChatCompleteAnonymizationTarget => ({
  targetType: 'data_view',
  targetId: `${DEFAULT_ALERT_DATA_VIEW_ID}-${spaceId}`,
});

/**
 * Filters raw alert data to only include essential fields and stringifies the result.
 * This reduces context window usage by keeping only the most relevant information.
 */
export const stringifyEssentialAlertData = (rawData: Record<string, string[]>): string => {
  return JSON.stringify(pick(rawData, ESSENTIAL_ALERT_FIELDS));
};
