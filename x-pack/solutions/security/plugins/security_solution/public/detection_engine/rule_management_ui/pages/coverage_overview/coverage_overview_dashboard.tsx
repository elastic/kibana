/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { THREAT_FRAMEWORK_NAME } from '@kbn/security-mitre-attack-common';
import { CoverageOverviewLink } from '../../../../common/components/links_to_docs';
import { HeaderPage } from '../../../../common/components/header_page';

import * as i18n from './translations';
import { CoverageOverviewMatrix } from './coverage_overview_matrix';
import { CoverageOverviewFiltersPanel } from './filters_panel';
import { useCoverageOverviewDashboardContext } from './coverage_overview_dashboard_context';
import { CoverageOverviewInvalidMitreRulesCallout } from './invalid_mitre_rules_callout';
import { useAvailableMitreFrameworks } from '../../../../common/hooks/mitre/use_available_mitre_frameworks';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

const CoverageOverviewDashboardComponent = () => {
  const {
    state: { framework, isLoading, isMitreError },
    actions: { setFramework },
  } = useCoverageOverviewDashboardContext();
  const isMitreAttackUpdatesUIEnabled = useIsExperimentalFeatureEnabled(
    'mitreAttackUpdatesUIEnabled'
  );
  const availableFrameworks = useAvailableMitreFrameworks();
  const frameworkLabel = THREAT_FRAMEWORK_NAME[framework];

  return (
    <>
      <HeaderPage
        title={i18n.COVERAGE_OVERVIEW_DASHBOARD_TITLE}
        subtitle={
          <EuiText color="subdued" size="s">
            <span>{i18n.CoverageOverviewDashboardInformation(frameworkLabel)}</span>{' '}
            <CoverageOverviewLink />
          </EuiText>
        }
      />
      {availableFrameworks.length > 1 && (
        <div data-test-subj="coverageOverviewFrameworkTabs">
          <EuiTabs size="m">
            {availableFrameworks.map((tabFramework) => (
              <EuiTab
                key={tabFramework}
                isSelected={framework === tabFramework}
                onClick={() => setFramework(tabFramework)}
                data-test-subj={`coverageOverviewFrameworkTab-${tabFramework}`}
              >
                {THREAT_FRAMEWORK_NAME[tabFramework]}
              </EuiTab>
            ))}
          </EuiTabs>
        </div>
      )}
      <EuiSpacer size="m" />
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
