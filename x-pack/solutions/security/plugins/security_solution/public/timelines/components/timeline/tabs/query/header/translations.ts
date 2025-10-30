/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CALL_OUT_UNAUTHORIZED_MSG = i18n.translate(
  'xpack.securitySolution.timeline.callOut.unauthorized.message.description',
  {
    defaultMessage:
      'You can use Timeline to investigate events, but you do not have the required permissions to save timelines for future use. If you need to save timelines, contact your Kibana administrator.',
  }
);

export const CALL_OUT_IMMUTABLE = i18n.translate(
  'xpack.securitySolution.timeline.callOut.immutable.message.description',
  {
    defaultMessage:
      'This prebuilt timeline template cannot be modified. To make changes, please duplicate this template and make modifications to the duplicate template.',
  }
);

export const CALL_OUT_ALERTS_ONLY_MIGRATION_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.callOut.alertsOnlyMigration.message.title',
  {
    defaultMessage: 'Show detection alerts option has been removed.',
  }
);

export const CALL_OUT_ALERTS_ONLY_MIGRATION_CONTENT = i18n.translate(
  'xpack.securitySolution.timeline.callOut.alertsOnlyMigration.message.description',
  {
    defaultMessage:
      'Show only alerts by adding a filter or switching to the security alerts data view.',
  }
);

export const CALL_OUT_ALERTS_ONLY_MIGRATION_SWITCH_BUTTON = i18n.translate(
  'xpack.securitySolution.timeline.callOut.alertsOnlyMigration.switchButton.label',
  {
    defaultMessage: 'Switch to alerts data view.',
  }
);

export const CALL_OUT_FILTER_FOR_ALERTS_BUTTON = i18n.translate(
  'xpack.securitySolution.timeline.callOut.alertsOnlyMigration.message.filterForAlerts',
  {
    defaultMessage: 'Filter for alerts.',
  }
);

export const ALERTS_ONLY_FILTER_ALIAS = i18n.translate(
  'xpack.securitySolution.timeline.filters.alertsOnlyFilterAlias',
  {
    defaultMessage: 'Alerts only',
  }
);
