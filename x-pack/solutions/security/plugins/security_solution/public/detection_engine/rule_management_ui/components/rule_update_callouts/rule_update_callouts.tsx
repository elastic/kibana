/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React, { useCallback } from 'react';
import { SecurityPageName } from '../../../../app/types';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { useKibana } from '../../../../common/lib/kibana';
import { usePrebuiltRulesStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';
import { MiniCallout } from '../mini_callout/mini_callout';
import {
  getUpdateRulesCalloutTitle,
  NEW_PREBUILT_RULES_AVAILABLE_CALLOUT_TITLE,
} from '../mini_callout/translations';
import { AllRulesTabs } from '../rules_table/rules_table_toolbar';

interface RuleUpdateCalloutsProps {
  shouldShowNewRulesCallout?: boolean;
  shouldShowUpdateRulesCallout?: boolean;
}

export const RuleUpdateCallouts = ({
  shouldShowNewRulesCallout = false,
  shouldShowUpdateRulesCallout = false,
}: RuleUpdateCalloutsProps) => {
  const { data: prebuiltRulesStatus } = usePrebuiltRulesStatus();

  const rulesToInstallCount = prebuiltRulesStatus?.stats.num_prebuilt_rules_to_install ?? 0;
  const rulesToUpgradeCount = prebuiltRulesStatus?.stats.num_prebuilt_rules_to_upgrade ?? 0;

  // Check against rulesInstalledCount since we don't want to show banners if we're showing the empty prompt
  const shouldDisplayNewRulesCallout = shouldShowNewRulesCallout && rulesToInstallCount > 0;
  const shouldDisplayUpdateRulesCallout = shouldShowUpdateRulesCallout && rulesToUpgradeCount > 0;

  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const { href } = getSecuritySolutionLinkProps({
    deepLinkId: SecurityPageName.rules,
    path: AllRulesTabs.updates,
  });
  const {
    application: { navigateToUrl },
  } = useKibana().services;

  const updateCallOutOnClick = useCallback(() => {
    navigateToUrl(href);
  }, [navigateToUrl, href]);

  return (
    <EuiFlexGroup direction="column">
      {shouldDisplayUpdateRulesCallout && (
        <MiniCallout
          iconType={'info'}
          data-test-subj="prebuilt-rules-update-callout"
          title={getUpdateRulesCalloutTitle(updateCallOutOnClick)}
        />
      )}
      {shouldDisplayNewRulesCallout && (
        <MiniCallout
          color="success"
          data-test-subj="prebuilt-rules-new-callout"
          iconType={'info'}
          title={NEW_PREBUILT_RULES_AVAILABLE_CALLOUT_TITLE}
        />
      )}
    </EuiFlexGroup>
  );
};
