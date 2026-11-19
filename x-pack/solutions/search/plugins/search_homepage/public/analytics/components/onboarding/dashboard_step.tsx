/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ANALYTICS_TELEMETRY_PREFIX } from '../../constants';
import type { SourceGenerationResult } from '../../hooks/use_source_generation';
import type { AnalyticsEventSource, AnalyticsLinks } from '../../types';
import { BuildDashboardButton } from '../shared/build_dashboard_button';

interface DashboardStepProps {
  links: AnalyticsLinks;
  source: AnalyticsEventSource | undefined;
  generation?: SourceGenerationResult;
}

export const DashboardStep = ({
  links,
  source,
  generation,
}: DashboardStepProps): React.JSX.Element => (
  <EuiPanel hasBorder paddingSize="l">
    <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
      <EuiFlexItem grow={false}>
        <BuildDashboardButton
          page="onboarding"
          source={source}
          fill
          links={links}
          generation={generation}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            links.canCreateDashboard
              ? undefined
              : i18n.translate(
                  'xpack.searchHomepage.analytics.onboarding.dashboard.missingPrivilege',
                  { defaultMessage: 'You need permission to create dashboards.' }
                )
          }
        >
          <EuiButtonEmpty
            onClick={links.createDashboard}
            isDisabled={!links.canCreateDashboard}
            hasAriaDisabled
            data-test-subj="analyticsOnboardingCreateBlankDashboard"
            data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-onboarding-createBlankDashboard`}
          >
            {i18n.translate('xpack.searchHomepage.analytics.onboarding.dashboard.blankButton', {
              defaultMessage: 'Start from a blank dashboard',
            })}
          </EuiButtonEmpty>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
