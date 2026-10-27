/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { AppHeaderTab } from '@kbn/app-header';
import { THREAT_FRAMEWORK_NAME } from '@kbn/security-mitre-attack-common';
import { SecurityAppHeader } from '../../../../common/components/app_header';
import { useAvailableMitreFrameworks } from '../../../../common/hooks/mitre/use_available_mitre_frameworks';
import { useKibana } from '../../../../common/lib/kibana';
import { useCoverageOverviewDashboardContext } from './coverage_overview_dashboard_context';
import * as i18n from './translations';

/**
 * App header of the MITRE coverage page: title, description of the selected framework, and framework tabs.
 * Must render inside `CoverageOverviewDashboardContextProvider`.
 */
export const CoverageOverviewAppHeader = React.memo(() => {
  const {
    state: { framework },
    actions: { setFramework },
  } = useCoverageOverviewDashboardContext();
  const { docLinks } = useKibana().services;
  const availableFrameworks = useAvailableMitreFrameworks();

  const description = useMemo(
    () => ({
      text: i18n.CoverageOverviewDashboardInformation(THREAT_FRAMEWORK_NAME[framework]),
      learnMoreUrl: docLinks.links.siem.mitreCoverage,
    }),
    [docLinks.links.siem.mitreCoverage, framework]
  );

  const tabs = useMemo<AppHeaderTab[] | undefined>(() => {
    if (availableFrameworks.length <= 1) {
      return undefined;
    }

    return availableFrameworks.map((tabFramework) => ({
      id: tabFramework,
      label: THREAT_FRAMEWORK_NAME[tabFramework],
      isSelected: framework === tabFramework,
      onClick: () => setFramework(tabFramework),
      'data-test-subj': `coverageOverviewFrameworkTab-${tabFramework}`,
    }));
  }, [availableFrameworks, framework, setFramework]);

  return (
    <SecurityAppHeader
      title={i18n.COVERAGE_OVERVIEW_DASHBOARD_TITLE}
      description={description}
      tabs={tabs}
      spacing="largeBleed"
    />
  );
});

CoverageOverviewAppHeader.displayName = 'CoverageOverviewAppHeader';
