/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DANGER_TITLE = i18n.translate(
  'xpack.securitySolution.overview.ctiDashboardDangerPanelTitle',
  {
    defaultMessage: 'No threat intelligence data',
  }
);

export const DANGER_BODY = i18n.translate(
  'xpack.securitySolution.overview.ctiDashboardEnableThreatIntel',
  {
    defaultMessage: 'You need to enable threat intel sources in order to view data.',
  }
);

export const DANGER_BUTTON = i18n.translate(
  'xpack.securitySolution.overview.ctiDashboardDangerButton',
  {
    defaultMessage: 'Enable sources',
  }
);

export const PANEL_TITLE = i18n.translate('xpack.securitySolution.overview.ctiDashboardTitle', {
  defaultMessage: 'Threat Intelligence',
});

export const VIEW_DASHBOARD = i18n.translate('xpack.securitySolution.overview.ctiViewDasboard', {
  defaultMessage: 'View dashboard',
});

export const OTHER_DATA_SOURCE_TITLE = i18n.translate(
  'xpack.securitySolution.overview.ctiDashboardOtherDatasourceTitle',
  {
    defaultMessage: 'Others',
  }
);

export const LINK_COPY = i18n.translate('xpack.securitySolution.overview.ctiLinkSource', {
  defaultMessage: 'Source',
});
