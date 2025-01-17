/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useState, useMemo } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { invariant } from '../../../../../common/utils/invariant';
import type { RuleSignatureId } from '../../../../../common/api/detection_engine';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';
import { RuleDetailsFlyout } from '../../../rule_management/components/rule_details/rule_details_flyout';
import { useRulePreviewContext } from './upgrade_prebuilt_rules_table/rule_preview_context';
interface UseRulePreviewFlyoutParams {
  rules: RuleResponse[];
  ruleActionsFactory: (
    rule: RuleResponse,
    closeRulePreview: () => void,
    isAnyFieldCurrentlyEdited: () => boolean
  ) => ReactNode;
  extraTabsFactory?: (rule: RuleResponse) => EuiTabbedContentTab[];
  subHeaderFactory?: (rule: RuleResponse) => ReactNode;
  flyoutProps: RulePreviewFlyoutProps;
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
  const {
    actions: { isAnyFieldCurrentlyEdited, clearEditedFields },
  } = useRulePreviewContext();

  const closeRulePreview = useCallback(() => {
    setRuleForPreview(undefined);
    clearEditedFields();
  }, [clearEditedFields]);

  const ruleActions = useMemo(
    () => rule && ruleActionsFactory(rule, closeRulePreview, isAnyFieldCurrentlyEdited),
    [rule, ruleActionsFactory, closeRulePreview, isAnyFieldCurrentlyEdited]
  );
  const extraTabs = useMemo(
    () => (rule && extraTabsFactory ? extraTabsFactory(rule) : []),
    [rule, extraTabsFactory]
  );

  const subHeader = useMemo(
    () => (rule ? subHeaderFactory?.(rule) : null),
    [subHeaderFactory, rule]
  );

  return {
    rulePreviewFlyout: rule && (
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
