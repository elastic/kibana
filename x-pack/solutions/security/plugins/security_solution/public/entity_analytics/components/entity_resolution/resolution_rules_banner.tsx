/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useResolutionRulesHealth } from './hooks/use_resolution_rules_health';
import {
  RULES_BANNER_DESCRIPTION,
  RULES_BANNER_TITLE_FAILING,
  RULES_BANNER_TITLE_RECENT,
  RULES_BANNER_VIEW_DASHBOARD,
} from './translations';
import {
  RESOLUTION_RULES_BANNER_BUTTON_TEST_ID,
  RESOLUTION_RULES_BANNER_TEST_ID,
} from './test_ids';

/**
 * PROTOTYPE, not for merge: a warning at the top of the Entity resolution tab when a rule is
 * failing now, or failed in the past 24 hours, with a button to the monitoring dashboard. It is
 * hidden when nothing failed. When the run stream cannot be read, only "failing now" can show it.
 */
export const ResolutionRulesBanner: React.FC = () => {
  const { data } = useResolutionRulesHealth();
  const { application } = useKibana().services;
  const dashboardId = data?.dashboard_id;

  const viewDashboard = useCallback(() => {
    if (dashboardId) {
      application.navigateToApp('dashboards', { path: `#/view/${dashboardId}` });
    }
  }, [application, dashboardId]);

  if (!data || (data.failing === 0 && (data.failed_runs_24h ?? 0) === 0)) {
    return null;
  }

  return (
    <>
      <KbnWarningCallout
        announceOnMount
        title={
          data.failing > 0 ? RULES_BANNER_TITLE_FAILING(data.failing) : RULES_BANNER_TITLE_RECENT
        }
        text={RULES_BANNER_DESCRIPTION}
        actionProps={
          data.dashboard_installed
            ? {
                primary: {
                  children: RULES_BANNER_VIEW_DASHBOARD,
                  onClick: viewDashboard,
                  'data-test-subj': RESOLUTION_RULES_BANNER_BUTTON_TEST_ID,
                },
              }
            : undefined
        }
        data-test-subj={RESOLUTION_RULES_BANNER_TEST_ID}
      />
      <EuiSpacer size="m" />
    </>
  );
};
