/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function MonitoringSetupModeProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  const SUBJ_SETUP_MODE_BTN = 'monitoringSetupModeBtn';
  const SUBJ_SETUP_MODE_BOTTOM_BAR = 'monitoringSetupModeBottomBar';
  const SUBJ_SETUP_MODE_METRICBEAT_MIGRATION_TOOLTIP =
    'monitoringSetupModeMetricbeatMigrationTooltip';
  const SUBJ_SETUP_MODE_ALERTS_BADGE = 'monitoringSetupModeAlertBadges';

  return new (class SetupMode {
    async doesSetupModeBtnAppear() {
      return await testSubjects.exists(SUBJ_SETUP_MODE_BTN);
    }

    async clickSetupModeBtn() {
      return await testSubjects.click(SUBJ_SETUP_MODE_BTN);
    }

    async doesBottomBarAppear() {
      return await testSubjects.exists(SUBJ_SETUP_MODE_BOTTOM_BAR);
    }

    async doesMetricbeatMigrationTooltipAppear() {
      return await testSubjects.exists(SUBJ_SETUP_MODE_METRICBEAT_MIGRATION_TOOLTIP);
    }

    async doesAlertsTooltipAppear() {
      return await testSubjects.exists(SUBJ_SETUP_MODE_ALERTS_BADGE);
    }
  })();
}
