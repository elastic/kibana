/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useState, useMemo, memo } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { invariant } from '../../../../../common/utils/invariant';
import type { RuleSignatureId } from '../../../../../common/api/detection_engine';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';
import { RuleDetailsFlyout } from '../../../rule_management/components/rule_details/rule_details_flyout';
import {
  RulePreviewContextProvider,
  useRulePreviewContext,
} from './upgrade_prebuilt_rules_table/rule_preview_context';
interface UseRulePreviewFlyoutBaseParams {
  ruleActionsFactory: (
    rule: RuleResponse,
    closeRulePreview: () => void,
    isRuleEdited: () => boolean
  ) => ReactNode;
  extraTabsFactory?: (rule: RuleResponse) => EuiTabbedContentTab[];
  subHeaderFactory?: (rule: RuleResponse) => ReactNode;
  flyoutProps: RulePreviewFlyoutProps;
}

interface UseRulePreviewFlyoutParams extends UseRulePreviewFlyoutBaseParams {
  rules: RuleResponse[];
}

interface RulePreviewFlyoutProps {
  /**
   * Rule preview flyout unique id used in HTML
   */
  id: string;
  dataTestSubj: string;
}

interface UseRulePreviewFlyoutResult {
  rulePreviewFlyout: ReactNode;
  openRulePreview: (ruleId: RuleSignatureId) => void;
  closeRulePreview: () => void;
}

export function useRulePreviewFlyout({
  rules,
  extraTabsFactory,
  ruleActionsFactory,
  subHeaderFactory,
  flyoutProps,
}: UseRulePreviewFlyoutParams): UseRulePreviewFlyoutResult {
  const [rule, setRuleForPreview] = useState<RuleResponse | undefined>();
  const closeRulePreview = useCallback(() => setRuleForPreview(undefined), []);

  return {
    rulePreviewFlyout: (
      <RulePreviewContextProvider key={rule?.rule_id}>
        <RulePreviewFlyoutInternal
          rule={rule}
          closeRulePreview={closeRulePreview}
          extraTabsFactory={extraTabsFactory}
          ruleActionsFactory={ruleActionsFactory}
          subHeaderFactory={subHeaderFactory}
          flyoutProps={flyoutProps}
        />
      </RulePreviewContextProvider>
    ),
    openRulePreview: useCallback(
      (ruleId: RuleSignatureId) => {
        const ruleToShowInFlyout = rules.find((x) => x.rule_id === ruleId);

        invariant(ruleToShowInFlyout, `Rule with rule_id ${ruleId} not found`);
        setRuleForPreview(ruleToShowInFlyout);
      },
      [rules, setRuleForPreview]
    ),
    closeRulePreview,
  };
}

const RulePreviewFlyoutInternal = memo(function RulePreviewFlyoutInternal({
  rule,
  closeRulePreview,
  extraTabsFactory,
  ruleActionsFactory,
  subHeaderFactory,
  flyoutProps,
}: UseRulePreviewFlyoutBaseParams & {
  rule: RuleResponse | undefined;
  closeRulePreview: () => void;
}) {
  const { isRuleEdited } = useRulePreviewContext();

  const ruleActions = useMemo(
    () => rule && ruleActionsFactory(rule, closeRulePreview, isRuleEdited),
    [rule, ruleActionsFactory, closeRulePreview, isRuleEdited]
  );
  const extraTabs = useMemo(
    () => (rule && extraTabsFactory ? extraTabsFactory(rule) : []),
    [rule, extraTabsFactory]
  );

  const subHeader = useMemo(
    () => (rule ? subHeaderFactory?.(rule) : null),
    [subHeaderFactory, rule]
  );

  if (!rule) {
    return null;
  }

  return (
    <RuleDetailsFlyout
      rule={rule}
      size="l"
      id={flyoutProps.id}
      dataTestSubj={flyoutProps.dataTestSubj}
      closeFlyout={closeRulePreview}
      ruleActions={ruleActions}
      extraTabs={extraTabs}
      subHeader={subHeader}
    />
  );
});
