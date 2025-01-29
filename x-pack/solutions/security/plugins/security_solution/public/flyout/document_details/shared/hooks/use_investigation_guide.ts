/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { UseBasicDataFromDetailsDataResult } from './use_basic_data_from_details_data';
import { useBasicDataFromDetailsData } from './use_basic_data_from_details_data';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';

export interface UseInvestigationGuideParams {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
}

export interface UseInvestigationGuideResult {
  /**
   * True if investigation guide data is loading
   */
  loading: boolean;
  /**
   * True if investigation guide data is in error state
   */
  error: unknown;
  /**
   * The basic alert fields and their value
   */
  basicAlertData: UseBasicDataFromDetailsDataResult;
  /**
   * The note from the rule
   */
  ruleNote: string | undefined;
}

/**
 * Checks if the investigation guide data for a given rule is available to render
 */
export const useInvestigationGuide = ({
  dataFormattedForFieldBrowser,
}: UseInvestigationGuideParams): UseInvestigationGuideResult => {
  const basicAlertData = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const { loading, error, rule: maybeRule } = useRuleWithFallback(basicAlertData.ruleId);

  return {
    loading,
    error,
    basicAlertData,
    ruleNote: maybeRule?.note,
  };
};
