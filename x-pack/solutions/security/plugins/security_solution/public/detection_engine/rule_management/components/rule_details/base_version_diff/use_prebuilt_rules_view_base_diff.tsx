/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { isCustomizedPrebuiltRule } from '../../../../../../common/api/detection_engine/model/rule_schema/utils';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import { useFetchPrebuiltRuleBaseVersionQuery } from '../../../api/hooks/prebuilt_rules/use_fetch_prebuilt_rule_base_version_query';
import { PrebuiltRulesBaseVersionFlyout } from './base_version_flyout';

export const PREBUILT_RULE_BASE_VERSION_FLYOUT_ANCHOR = 'baseVersionPrebuiltRulePreview';

export interface OpenRuleDiffFlyoutParams {
  isReverting?: boolean;
}

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
  const enabled = useMemo(() => rule != null && isCustomizedPrebuiltRule(rule), [rule]);
  const { data, isLoading, error } = useFetchPrebuiltRuleBaseVersionQuery({
    id: rule?.id,
    enabled,
  });

  // Handle when we receive an error when the base_version doesn't exist
  const doesBaseVersionExist: boolean = useMemo(() => !error && data != null, [data, error]);

  const openBaseVersionFlyout = useCallback(
    ({ isReverting: renderRevertFeatures = false }: OpenRuleDiffFlyoutParams) => {
      setIsReverting(renderRevertFeatures);
      setIsFlyoutOpen(true);
    },
    []
  );

  const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  const modifiedFields = useMemo(
    () => new Set(Object.keys(data?.diff.fields ?? {})),
    [data?.diff.fields]
  );

  return {
    baseVersionFlyout:
      isFlyoutOpen && !isLoading && data != null && doesBaseVersionExist ? (
        <PrebuiltRulesBaseVersionFlyout
          diff={data.diff}
          currentRule={data.current_version}
          baseRule={data.base_version}
          isReverting={isReverting}
          closeFlyout={closeFlyout}
          onRevert={onRevert}
        />
      ) : null,
    openBaseVersionFlyout,
    doesBaseVersionExist,
    isLoading,
    modifiedFields,
  };
};
