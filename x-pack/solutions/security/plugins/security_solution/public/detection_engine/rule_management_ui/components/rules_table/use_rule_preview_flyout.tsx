/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useState, useMemo, memo } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { RuleUpgradeEventTypes } from '../../../../common/lib/telemetry/events/rule_upgrade/types';
import { invariant } from '../../../../../common/utils/invariant';
import type { RuleSignatureId } from '../../../../../common/api/detection_engine';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';
import { RuleDetailsFlyout } from '../../../rule_management/components/rule_details/rule_details_flyout';
import {
  RulePreviewContextProvider,
  useRulePreviewContext,
} from './upgrade_prebuilt_rules_table/rule_preview_context';
import type { RuleUpgradeState } from '../../../rule_management/model/prebuilt_rule_upgrade';
import { useKibana } from '../../../../common/lib/kibana';

interface UseRulePreviewFlyoutBaseParams {
  ruleActionsFactory: (
    rule: RuleResponse,
    closeRulePreview: () => void,
    isEditingRule: boolean
  ) => ReactNode;
  extraTabsFactory?: (rule: RuleResponse) => EuiTabbedContentTab[];
  subHeaderFactory?: (rule: RuleResponse) => ReactNode;
  flyoutProps: RulePreviewFlyoutProps;
}

interface UseRulePreviewFlyoutParams extends UseRulePreviewFlyoutBaseParams {
  rules: RuleResponse[];
  rulesUpgradeState?: Record<string, RuleUpgradeState>;
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
  closeRulePreview: (type: 'update' | 'dismiss') => void;
}

export function useRulePreviewFlyout({
  rules,
  rulesUpgradeState,
  extraTabsFactory,
  ruleActionsFactory,
  subHeaderFactory,
  flyoutProps,
}: UseRulePreviewFlyoutParams): UseRulePreviewFlyoutResult {
  const [rule, setRuleForPreview] = useState<RuleResponse | undefined>();
  const { telemetry } = useKibana().services;

  const closeRulePreview = useCallback(
    (type: 'update' | 'dismiss') => {
      setRuleForPreview(undefined);
      if (rule && rulesUpgradeState) {
        const ruleUpgradeState = rulesUpgradeState[rule.rule_id];
        const hasMissingBaseVersion = ruleUpgradeState?.has_base_version === false;
        telemetry.reportEvent(RuleUpgradeEventTypes.RuleUpgradeFlyoutButtonClick, {
          type,
          hasMissingBaseVersion,
        });
      }
    },
    [rule, rulesUpgradeState, telemetry]
  );
  const openRulePreview = useCallback(
    (ruleId: RuleSignatureId) => {
      const ruleToShowInFlyout = rules.find((x) => x.rule_id === ruleId);

      invariant(ruleToShowInFlyout, `Rule with rule_id ${ruleId} not found`);
      setRuleForPreview(ruleToShowInFlyout);
    },
    [rules, setRuleForPreview]
  );
  const rulePreviewFlyout = (
    <RulePreviewContextProvider ruleId={rule?.rule_id}>
      <RulePreviewFlyoutInternal
        rule={rule}
        closeRulePreview={closeRulePreview}
        extraTabsFactory={extraTabsFactory}
        ruleActionsFactory={ruleActionsFactory}
        subHeaderFactory={subHeaderFactory}
        flyoutProps={flyoutProps}
      />
    </RulePreviewContextProvider>
  );

  return {
    rulePreviewFlyout,
    openRulePreview,
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
  closeRulePreview: (type: 'update' | 'dismiss') => void;
}) {
  const { isEditingRule } = useRulePreviewContext();

  const ruleActions = useMemo(
    () => rule && ruleActionsFactory(rule, () => closeRulePreview('update'), isEditingRule),
    [rule, ruleActionsFactory, closeRulePreview, isEditingRule]
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
      closeFlyout={() => closeRulePreview('dismiss')}
      ruleActions={ruleActions}
      extraTabs={extraTabs}
      subHeader={subHeader}
    />
  );
});
