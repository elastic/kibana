/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useRef, useEffect } from 'react';
import { EuiButton, EuiCallOut, EuiSpacer, EuiToolTip } from '@elastic/eui';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import type { PartialRuleDiff, RuleResponse } from '../../../../../../common/api/detection_engine';
import { PerFieldRuleDiffTab } from '../per_field_rule_diff_tab';
import { RuleDetailsFlyout, TabContentPadding } from '../rule_details_flyout';
import * as ruleDetailsI18n from '../translations';
import * as i18n from './translations';
import { RuleDiffTab } from '../rule_diff_tab';
import { BaseVersionDiffFlyoutSubheader } from './base_version_flyout_subheader';
import {
  getRevertRuleErrorStatusCode,
  useRevertPrebuiltRule,
} from '../../../logic/prebuilt_rules/use_revert_prebuilt_rule';

export const PREBUILT_RULE_BASE_VERSION_FLYOUT_ANCHOR = 'baseVersionPrebuiltRulePreview';

interface PrebuiltRuleConcurrencyControl {
  revision: number;
}

interface PrebuiltRulesBaseVersionFlyoutComponentProps {
  currentRule: RuleResponse;
  baseRule: RuleResponse;
  diff: PartialRuleDiff;
  closeFlyout: () => void;
  isReverting: boolean;
  onRevert?: () => void;
}

export const PrebuiltRulesBaseVersionFlyout = memo(function PrebuiltRulesBaseVersionFlyout({
  currentRule,
  baseRule,
  diff,
  closeFlyout,
  isReverting,
  onRevert,
}: PrebuiltRulesBaseVersionFlyoutComponentProps): JSX.Element {
  useConcurrencyControl(currentRule);

  const { mutateAsync: revertPrebuiltRule, isLoading } = useRevertPrebuiltRule();
  const subHeader = useMemo(
    () => <BaseVersionDiffFlyoutSubheader currentRule={currentRule} diff={diff} />,
    [currentRule, diff]
  );

  const revertRule = useCallback(async () => {
    try {
      await revertPrebuiltRule({
        id: currentRule.id,
        version: currentRule.version,
        revision: currentRule.revision,
      });
      closeFlyout();
    } catch (error) {
      const statusCode = getRevertRuleErrorStatusCode(error);
      // Don't close flyout on concurrency errors
      if (statusCode !== 409) {
        closeFlyout();
      }
    } finally {
      if (onRevert) {
        onRevert();
      }
    }
  }, [
    closeFlyout,
    currentRule.id,
    currentRule.revision,
    currentRule.version,
    onRevert,
    revertPrebuiltRule,
  ]);

  const ruleActions = useMemo(() => {
    return isReverting ? (
      <EuiButton
        onClick={revertRule}
        isDisabled={isLoading}
        fill
        data-test-subj="revertPrebuiltRuleFromFlyoutButton"
      >
        {i18n.REVERT_BUTTON_LABEL}
      </EuiButton>
    ) : null;
  }, [isLoading, isReverting, revertRule]);

  const extraTabs = useMemo(() => {
    const headerCallout = isReverting ? (
      <>
        <EuiCallOut title={i18n.REVERTING_RULE_CALLOUT_TITLE} color="warning" iconType="warning">
          <p>{i18n.REVERTING_RULE_CALLOUT_MESSAGE}</p>
        </EuiCallOut>
        <EuiSpacer size="l" />
      </>
    ) : null;

    const updatesTab = {
      id: 'updates',
      name: (
        <EuiToolTip position="top" content={i18n.BASE_VERSION_FLYOUT_UPDATES_TAB_TOOLTIP}>
          <>{i18n.BASE_VERSION_FLYOUT_UPDATES_TAB_TITLE}</>
        </EuiToolTip>
      ),
      content: (
        <TabContentPadding>
          <PerFieldRuleDiffTab
            header={headerCallout}
            ruleDiff={diff}
            diffRightSideTitle={i18n.BASE_VERSION_LABEL}
          />
        </TabContentPadding>
      ),
    };

    const jsonViewTab = {
      id: 'jsonViewUpdates',
      name: (
        <EuiToolTip position="top" content={i18n.BASE_VERSION_FLYOUT_JSON_TAB_TOOLTIP}>
          <>{ruleDetailsI18n.JSON_VIEW_UPDATES_TAB_LABEL}</>
        </EuiToolTip>
      ),
      content: (
        <div>
          <RuleDiffTab
            oldRule={currentRule}
            newRule={baseRule}
            newRuleLabel={i18n.BASE_VERSION_LABEL}
          />
        </div>
      ),
    };

    return [updatesTab, jsonViewTab];
  }, [baseRule, currentRule, diff, isReverting]);

  return (
    <RuleDetailsFlyout
      title={i18n.BASE_VERSION_FLYOUT_TITLE}
      rule={currentRule}
      size="l"
      id={PREBUILT_RULE_BASE_VERSION_FLYOUT_ANCHOR}
      dataTestSubj={PREBUILT_RULE_BASE_VERSION_FLYOUT_ANCHOR}
      closeFlyout={closeFlyout}
      ruleActions={ruleActions}
      extraTabs={extraTabs}
      subHeader={subHeader}
    />
  );
});

/**
 * We should detect situations when the rule is edited or upgraded concurrently.
 *
 * `revision` is the indication for any changes.
 * If `rule.revision` has suddenly increased then it means we hit a concurrency issue.
 *
 * `rule.revision` gets bumped upon rule upgrade as well.
 */
function useConcurrencyControl(rule: RuleResponse): void {
  const concurrencyControl = useRef<PrebuiltRuleConcurrencyControl>();
  const { addWarning } = useAppToasts();

  useEffect(() => {
    const concurrency = concurrencyControl.current;

    if (concurrency != null && concurrency.revision !== rule.revision) {
      addWarning({
        title: i18n.NEW_REVISION_DETECTED_WARNING,
        text: i18n.NEW_REVISION_DETECTED_WARNING_MESSAGE,
      });
    }

    concurrencyControl.current = {
      revision: rule.revision,
    };
  }, [addWarning, rule.revision]);
}
