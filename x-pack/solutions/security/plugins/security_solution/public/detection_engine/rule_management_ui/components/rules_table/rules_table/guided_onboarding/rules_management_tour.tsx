/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTourActions, EuiTourStepProps } from '@elastic/eui';
import { EuiButtonEmpty, EuiTourStep } from '@elastic/eui';
import { noop } from 'lodash';
import React, { useCallback, useEffect, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { siemGuideId } from '../../../../../../../common/guided_onboarding/siem_guide_config';
import { BulkActionTypeEnum } from '../../../../../../../common/api/detection_engine/rule_management';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useFindRulesQuery } from '../../../../../rule_management/api/hooks/use_find_rules_query';
import { useExecuteBulkAction } from '../../../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import { useRulesTableContext } from '../rules_table_context';
import * as i18n from './translations';
import { useIsElementMounted } from './use_is_element_mounted';

export const INSTALL_PREBUILT_RULES_ANCHOR = 'install-prebuilt-rules-anchor';
export const SEARCH_FIRST_RULE_ANCHOR = 'search-first-rule-anchor';

export interface RulesFeatureTourContextType {
  steps: EuiTourStepProps[];
  actions: EuiTourActions;
}

const GUIDED_ONBOARDING_RULES_FILTER = {
  filter: '',
  showCustomRules: false,
  showElasticRules: true,
  tags: ['Use Case: Guided Onboarding'],
};

export enum GuidedOnboardingRulesStatus {
  'inactive' = 'inactive',
  'installRules' = 'installRules',
  'searchRules' = 'searchRules',
  'enableRules' = 'enableRules',
  'completed' = 'completed',
}

export const RulesManagementTour = () => {
  const { guidedOnboarding } = useKibana().services;
  const { executeBulkAction } = useExecuteBulkAction();
  const { actions } = useRulesTableContext();

  const isRulesStepActive = useObservable(
    guidedOnboarding?.guidedOnboardingApi?.isGuideStepActive$(siemGuideId, 'rules') ?? of(false),
    false
  );

  const { data: onboardingRules } = useFindRulesQuery(
    { filterOptions: GUIDED_ONBOARDING_RULES_FILTER },
    { enabled: isRulesStepActive }
  );

  const demoRule = useMemo(() => {
    // Rules are loading, cannot search for rule ID
    if (!onboardingRules?.rules.length) {
      return;
    }
    // Return any rule, first one is good enough
    return onboardingRules.rules[0];
  }, [onboardingRules]);

  const ruleSwitchAnchor = demoRule ? `rule-switch-${demoRule.id}` : '';

  /**
   * Wait until the tour target elements are visible on the page and mount
   * EuiTourStep components only after that. Otherwise, the tours would never
   * show up on the page.
   */
  const isInstallRulesAnchorMounted = useIsElementMounted(INSTALL_PREBUILT_RULES_ANCHOR);
  const isSearchFirstRuleAnchorMounted = useIsElementMounted(SEARCH_FIRST_RULE_ANCHOR);
  const isActivateFirstRuleAnchorMounted = useIsElementMounted(ruleSwitchAnchor);

  const tourStatus = useMemo(() => {
    if (!isRulesStepActive || !onboardingRules) {
      return GuidedOnboardingRulesStatus.inactive;
    }

    if (onboardingRules.total === 0) {
      // Onboarding rules are not installed - show the navigate to Add Rules page step
      return GuidedOnboardingRulesStatus.installRules;
    }

    if (demoRule?.enabled) {
      // Rules are installed and enabled - the tour is completed
      return GuidedOnboardingRulesStatus.completed;
    }

    // Rule is installed but not enabled - show the find and activate steps
    if (isActivateFirstRuleAnchorMounted) {
      // If rule is visible on the table, show the activation step
      return GuidedOnboardingRulesStatus.enableRules;
    } else {
      // If rule is not visible on the table, show the search step
      return GuidedOnboardingRulesStatus.searchRules;
    }
  }, [demoRule?.enabled, isActivateFirstRuleAnchorMounted, isRulesStepActive, onboardingRules]);

  // Synchronize the current "internal" tour step with the global one
  useEffect(() => {
    if (isRulesStepActive && tourStatus === GuidedOnboardingRulesStatus.completed) {
      guidedOnboarding?.guidedOnboardingApi?.completeGuideStep('siem', 'rules');
    }
  }, [guidedOnboarding, isRulesStepActive, tourStatus]);

  const enableDemoRule = useCallback(async () => {
    if (demoRule) {
      await executeBulkAction({
        type: BulkActionTypeEnum.enable,
        ids: [demoRule.id],
      });
    }
  }, [demoRule, executeBulkAction]);

  const findDemoRule = useCallback(() => {
    if (demoRule) {
      actions.setFilterOptions({
        filter: demoRule.name,
      });
    }
  }, [actions, demoRule]);

  return (
    <>
      {isInstallRulesAnchorMounted && (
        <EuiTourStep
          title={i18n.INSTALL_PREBUILT_RULES_TITLE}
          content={i18n.INSTALL_PREBUILT_RULES_CONTENT}
          onFinish={noop}
          step={1}
          stepsTotal={3}
          isOpen={tourStatus === GuidedOnboardingRulesStatus.installRules}
          anchor={`#${INSTALL_PREBUILT_RULES_ANCHOR}`}
          anchorPosition="downCenter"
          footerAction={<div />} // Replace "Skip tour" with an empty element
        />
      )}
      {isSearchFirstRuleAnchorMounted && demoRule && (
        <EuiTourStep
          title={i18n.SEARCH_FIRST_RULE_TITLE}
          content={i18n.SEARCH_FIRST_RULE_CONTENT(demoRule.name)}
          onFinish={noop}
          step={2}
          stepsTotal={3}
          isOpen={tourStatus === GuidedOnboardingRulesStatus.searchRules}
          anchor={`#${SEARCH_FIRST_RULE_ANCHOR}`}
          anchorPosition="upCenter"
          footerAction={
            <EuiButtonEmpty size="xs" color="text" flush="right" onClick={findDemoRule}>
              {i18n.NEXT_BUTTON}
            </EuiButtonEmpty>
          }
        />
      )}
      {isActivateFirstRuleAnchorMounted && demoRule && (
        <EuiTourStep
          title={i18n.ENABLE_FIRST_RULE_TITLE}
          content={i18n.ENABLE_FIRST_RULE_CONTENT(demoRule.name)}
          onFinish={noop}
          step={3}
          stepsTotal={3}
          isOpen={tourStatus === GuidedOnboardingRulesStatus.enableRules}
          anchor={`#${ruleSwitchAnchor}`}
          anchorPosition="upCenter"
          footerAction={
            <EuiButtonEmpty size="xs" color="text" flush="right" onClick={enableDemoRule}>
              {i18n.NEXT_BUTTON}
            </EuiButtonEmpty>
          }
        />
      )}
    </>
  );
};
