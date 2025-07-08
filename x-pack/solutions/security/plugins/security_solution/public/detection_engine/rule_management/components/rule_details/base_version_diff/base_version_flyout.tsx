/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
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
import { DiffLayout } from '../../../model/rule_details/rule_field_diff';

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
}

export const PrebuiltRulesBaseVersionFlyout = memo(function PrebuiltRulesBaseVersionFlyout({
  currentRule,
  baseRule,
  diff,
  closeFlyout,
  isReverting,
}: PrebuiltRulesBaseVersionFlyoutComponentProps): JSX.Element {
  const isOutdated = useConcurrencyControl(currentRule);

  const { mutateAsync: revertPrebuiltRule, isLoading } = useRevertPrebuiltRule();
  const subHeader = useMemo(
    () => (
      <BaseVersionDiffFlyoutSubheader
        currentRule={currentRule}
        diff={diff}
        isOutdated={isOutdated}
      />
    ),
    [currentRule, diff, isOutdated]
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
    }
  }, [closeFlyout, currentRule.id, currentRule.revision, currentRule.version, revertPrebuiltRule]);

  const ruleActions = useMemo(() => {
    return isReverting ? (
      <EuiButton
        onClick={revertRule}
        isDisabled={isLoading || isOutdated}
        fill
        data-test-subj="revertPrebuiltRuleFromFlyoutButton"
        iconType="arrowStart"
        iconSide="left"
      >
        {i18n.REVERT_BUTTON_LABEL}
      </EuiButton>
    ) : null;
  }, [isLoading, isOutdated, isReverting, revertRule]);

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
            leftDiffSideLabel={i18n.BASE_VERSION_LABEL}
            rightDiffSideLabel={i18n.CURRENT_VERSION_LABEL}
            leftDiffSideDescription={i18n.BASE_VERSION_DESCRIPTION}
            rightDiffSideDescription={i18n.CURRENT_VERSION_DESCRIPTION}
            diffLayout={DiffLayout.RightToLeft}
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
            oldRule={baseRule}
            newRule={currentRule}
            leftDiffSideLabel={i18n.BASE_VERSION_LABEL}
            rightDiffSideLabel={i18n.CURRENT_VERSION_LABEL}
            leftDiffSideDescription={i18n.BASE_VERSION_DESCRIPTION}
            rightDiffSideDescription={i18n.CURRENT_VERSION_DESCRIPTION}
          />
        </div>
      ),
    };

    return [updatesTab, jsonViewTab];
    /**
     * We want to statically load this data so it doesn't change while user is viewing so
     * we don't rerender the diff displays based on `currentRule`, `baseRule`, or `diff`.
     * User is alerted to stale data when present via the `isOutdated` prop
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReverting]);

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
function useConcurrencyControl(rule: RuleResponse): boolean {
  const concurrencyControl = useRef<PrebuiltRuleConcurrencyControl>();
  const [isOutdated, setIsOutdated] = useState(false);
  const { addWarning } = useAppToasts();

  useEffect(() => {
    const concurrency = concurrencyControl.current;

    if (concurrency != null && concurrency.revision !== rule.revision) {
      addWarning({
        title: i18n.NEW_REVISION_DETECTED_WARNING,
        text: i18n.NEW_REVISION_DETECTED_WARNING_MESSAGE,
      });
      setIsOutdated(true);
    }

    concurrencyControl.current = {
      revision: rule.revision,
    };
  }, [addWarning, rule.revision]);

  return isOutdated;
}
