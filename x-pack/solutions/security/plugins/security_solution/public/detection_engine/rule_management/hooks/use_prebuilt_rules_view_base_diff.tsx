/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';

import { get } from 'lodash';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { PrebuiltRulesBaseVersionFlyout } from '../components/rule_details/base_version_diff/base_version_flyout';
import { useFetchPrebuiltRuleBaseVersionQuery } from '../api/hooks/prebuilt_rules/use_fetch_prebuilt_rule_base_version_query';

export const PREBUILT_RULE_BASE_VERSION_FLYOUT_ANCHOR = 'baseVersionPrebuiltRulePreview';

interface UsePrebuiltRulesViewBaseDiffProps {
  rule: RuleResponse | null;
  onRevert?: () => void;
}

export const usePrebuiltRulesViewBaseDiff = ({
  rule,
  onRevert,
}: UsePrebuiltRulesViewBaseDiffProps) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const { data, isLoading, error } = useFetchPrebuiltRuleBaseVersionQuery(rule);

  // Handle when we receive a 404 error when the base_version doesn't exist
  const doesBaseVersionExist = useMemo(() => {
    if (error) {
      const statusCode = get(error, 'response.status');
      if (statusCode === 404) {
        return false;
      }
    }
    return data ? data.hasBaseVersion : false;
  }, [data, error]);

  const openFlyout = useCallback((renderRevertFeatures: boolean = false) => {
    setIsReverting(renderRevertFeatures);
    setIsFlyoutOpen(true);
  }, []);

  const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  return {
    baseVersionFlyout:
      isFlyoutOpen && !isLoading && data?.hasBaseVersion ? (
        <PrebuiltRulesBaseVersionFlyout
          diff={data.diff}
          currentRule={data.current_version}
          baseRule={data.base_version}
          isReverting={isReverting}
          closeFlyout={closeFlyout}
          onRevert={onRevert}
        />
      ) : null,
    openFlyout,
    doesBaseVersionExist,
    isLoading,
  };
};
