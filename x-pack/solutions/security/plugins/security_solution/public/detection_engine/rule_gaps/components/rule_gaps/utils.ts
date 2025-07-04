/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { gapStatus } from '@kbn/alerting-plugin/common';
import type { GapStatus } from '../../types';
import * as i18n from './translations';

export const getStatusLabel = (status: GapStatus) => {
  switch (status) {
    case gapStatus.PARTIALLY_FILLED:
      return i18n.GAP_STATUS_PARTIALLY_FILLED;
    case gapStatus.UNFILLED:
      return i18n.GAP_STATUS_UNFILLED;
    case gapStatus.FILLED:
      return i18n.GAP_STATUS_FILLED;
  }
  return '';
};
