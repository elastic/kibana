/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiButton, EuiCallOut, EuiSpacer, EuiToolTip } from '@elastic/eui';
import type { PartialRuleDiff, RuleResponse } from '../../../../../../common/api/detection_engine';
import { PerFieldRuleDiffTab } from '../per_field_rule_diff_tab';
import { RuleDetailsFlyout, TabContentPadding } from '../rule_details_flyout';
import * as ruleDetailsI18n from '../translations';
import * as i18n from './translations';
import { RuleDiffTab } from '../rule_diff_tab';
import { BaseVersionDiffFlyoutSubheader } from './base_version_flyout_subheader';
import { useRevertPrebuiltRule } from '../../../logic/prebuilt_rules/use_revert_prebuilt_rule';

export const PREBUILT_RULE_BASE_VERSION_FLYOUT_ANCHOR = 'baseVersionPrebuiltRulePreview';

interface PrebuiltRulesBaseVersionFlyoutComponentProps {
  currentRule: RuleResponse;
  baseRule: RuleResponse;
  diff: PartialRuleDiff;
  closeFlyout: () => void;
  isReverting: boolean;
  onRevert?: () => void;
}

const PrebuiltRulesBaseVersionFlyoutComponent = ({
  currentRule,
  baseRule,
  diff,
  closeFlyout,
  isReverting,
  onRevert,
}: PrebuiltRulesBaseVersionFlyoutComponentProps) => {
  const { mutateAsync: revertPrebuiltRule, isLoading } = useRevertPrebuiltRule();
  const subHeader = useMemo(
    () => <BaseVersionDiffFlyoutSubheader currentRule={currentRule} diff={diff} />,
    [currentRule, diff]
  );

  const ruleActions = useMemo(() => {
    return isReverting ? (
      <EuiButton
        onClick={async () => {
          await revertPrebuiltRule({
            id: currentRule.id,
            version: currentRule.version,
            revision: currentRule.revision,
          });
          closeFlyout();
          if (onRevert) {
            onRevert();
          }
        }}
        isDisabled={isLoading}
        fill
        data-test-subj="revertPrebuiltRuleFromFlyoutButton"
      >
        {i18n.REVERT_BUTTON_LABEL}
      </EuiButton>
    ) : null;
  }, [
    closeFlyout,
    currentRule.id,
    currentRule.revision,
    currentRule.version,
    isLoading,
    isReverting,
    onRevert,
    revertPrebuiltRule,
  ]);

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
          <>{'Elastic rule diff overview'}</>
        </EuiToolTip>
      ),
      content: (
        <TabContentPadding>
          <PerFieldRuleDiffTab
            header={headerCallout}
            ruleDiff={diff}
            newRuleLabel={i18n.BASE_VERSION_LABEL}
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
};

export const PrebuiltRulesBaseVersionFlyout = memo(PrebuiltRulesBaseVersionFlyoutComponent);
