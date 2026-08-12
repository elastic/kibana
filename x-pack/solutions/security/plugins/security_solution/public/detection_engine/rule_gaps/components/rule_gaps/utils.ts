/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { gapStatus, gapReasonType } from '@kbn/alerting-plugin/common';
import type { GapReasonType, GapStatus } from '../../types';
import * as i18n from './translations';

/**
 * Returns the reason types that should be excluded from the gaps query.
 * When selectedReasonTypes is empty (all options deselected), returns [] so that
 * no filter is applied and all gaps are shown — consistent with the Status filter.
 */
export const getExcludedReasons = (
  selectedReasonTypes: GapReasonType[],
  allReasonTypes: GapReasonType[]
): GapReasonType[] => {
  if (selectedReasonTypes.length === 0) return [];
  return allReasonTypes.filter((reason) => !selectedReasonTypes.includes(reason));
};

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

export const getReasonLabel = (reason: GapReasonType | undefined) => {
  switch (reason) {
    case gapReasonType.RULE_DISABLED:
      return i18n.GAP_REASON_RULE_DISABLED;
    case gapReasonType.RULE_DID_NOT_RUN:
      return i18n.GAP_REASON_RULE_DID_NOT_RUN;
  }
  return '';
};
