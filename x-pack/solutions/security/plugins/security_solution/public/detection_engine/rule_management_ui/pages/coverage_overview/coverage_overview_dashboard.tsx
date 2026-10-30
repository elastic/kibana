/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { THREAT_FRAMEWORK_NAME } from '@kbn/security-mitre-attack-common';

import * as i18n from './translations';
import { CoverageOverviewMatrix } from './coverage_overview_matrix';
import { CoverageOverviewFiltersPanel } from './filters_panel';
import { useCoverageOverviewDashboardContext } from './coverage_overview_dashboard_context';
import { CoverageOverviewInvalidMitreRulesCallout } from './invalid_mitre_rules_callout';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

const CoverageOverviewDashboardComponent = () => {
  const {
    state: { framework, isLoading, isMitreError },
  } = useCoverageOverviewDashboardContext();
  const isMitreAttackUpdatesUIEnabled = useIsExperimentalFeatureEnabled(
    'mitreAttackUpdatesUIEnabled'
  );
  const frameworkLabel = THREAT_FRAMEWORK_NAME[framework];

  return (
    <>
      <EuiSpacer size="s" />
      {isMitreAttackUpdatesUIEnabled && <CoverageOverviewInvalidMitreRulesCallout />}
      <CoverageOverviewFiltersPanel />
      <EuiSpacer />
      {isLoading ? (
        <EuiFlexGroup justifyContent="center" data-test-subj="coverageOverviewLoadingSpinner">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : isMitreError ? (
        <KbnDangerCallout
          announceOnMount
          title={i18n.COVERAGE_OVERVIEW_MITRE_ERROR_TITLE(frameworkLabel)}
          data-test-subj="coverageOverviewMitreErrorCallout"
        >
          <p>{i18n.COVERAGE_OVERVIEW_MITRE_ERROR_BODY(frameworkLabel)}</p>
        </KbnDangerCallout>
      ) : (
        <CoverageOverviewMatrix />
      )}
    </>
  );
};

export const CoverageOverviewDashboard = CoverageOverviewDashboardComponent;
