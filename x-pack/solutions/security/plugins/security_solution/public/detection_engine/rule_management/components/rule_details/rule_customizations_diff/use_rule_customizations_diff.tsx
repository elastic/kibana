/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import { isCustomizedPrebuiltRule } from '../../../../../../common/api/detection_engine/model/rule_schema/utils';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import { useFetchPrebuiltRuleBaseVersionQuery } from '../../../api/hooks/prebuilt_rules/use_fetch_prebuilt_rule_base_version_query';
import { RuleCustomizationsFlyout } from './rule_customizations_flyout';

export const PREBUILT_RULE_CUSTOMIZATIONS_FLYOUT_ANCHOR = 'PrebuiltRuleCustomizationsPreview';

interface UseRuleCustomizationsDiffProps {
  rule: RuleResponse | null;
}

export const useRuleCustomizationsDiff = ({ rule }: UseRuleCustomizationsDiffProps) => {
  const [isFlyoutOpen, { off: closeFlyout, on: openFlyout }] = useBoolean(false);
  const [isReverting, { off: setRevertingFalse, on: setRevertingTrue }] = useBoolean(false);

  const enabled = useMemo(() => rule != null && isCustomizedPrebuiltRule(rule), [rule]);
  const { data, isLoading, error } = useFetchPrebuiltRuleBaseVersionQuery({
    id: rule?.id,
    enabled,
  });

  // Handle when we receive an error when the base_version doesn't exist
  const doesBaseVersionExist: boolean = useMemo(() => !error && data != null, [data, error]);

  const openCustomizationsPreviewFlyout = useCallback(() => {
    setRevertingFalse();
    openFlyout();
  }, [openFlyout, setRevertingFalse]);

  const openCustomizationsRevertFlyout = useCallback(() => {
    setRevertingTrue();
    openFlyout();
  }, [openFlyout, setRevertingTrue]);

  const modifiedFields = useMemo(
    () => new Set(Object.keys(data?.diff.fields ?? {})),
    [data?.diff.fields]
  );

  return {
    ruleCustomizationsFlyout:
      isFlyoutOpen && !isLoading && data != null && doesBaseVersionExist ? (
        <RuleCustomizationsFlyout
          diff={data.diff}
          currentRule={data.current_version}
          baseRule={data.base_version}
          isReverting={isReverting}
          closeFlyout={closeFlyout}
        />
      ) : null,
    openCustomizationsPreviewFlyout,
    openCustomizationsRevertFlyout,
    doesBaseVersionExist,
    isLoading,
    modifiedFields,
  };
};
