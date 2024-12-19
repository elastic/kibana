/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERTS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsModal.alertsLabel',
  {
    defaultMessage: 'Alerts',
  }
);

export const ATTACK_DISCOVERY_SENDS_MORE_ALERTS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsModal.attackDiscoverySendsMoreAlertsTourText',
  {
    defaultMessage: 'Attack discovery sends more alerts as context.',
  }
);

export const CANCEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsModal.cancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const CONFIGURE_YOUR_SETTINGS_HERE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsModal.configureYourSettingsHereTourText',
  {
    defaultMessage: 'Configure your settings here.',
  }
);

export const LATEST_AND_RISKIEST_OPEN_ALERTS = (alertsCount: number) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.settingsModal.latestAndRiskiestOpenAlertsLabel',
    {
      defaultMessage:
        'Send Attack discovery information about your {alertsCount} newest and riskiest open or acknowledged alerts.',
      values: { alertsCount },
    }
  );

export const SAVE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsModal.saveButton',
  {
    defaultMessage: 'Save',
  }
);

export const SEND_MORE_ALERTS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsModal.tourTitle',
  {
    defaultMessage: 'Send more alerts',
  }
);

export const SETTINGS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsModal.settingsLabel',
  {
    defaultMessage: 'Settings',
  }
);

export const RECENT_ATTACK_DISCOVERY_IMPROVEMENTS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsModal.tourSubtitle',
  {
    defaultMessage: 'Recent Attack discovery improvements',
  }
);

export const RESET = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsModal.resetLabel',
  {
    defaultMessage: 'Reset',
  }
);
