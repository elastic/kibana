/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RUN = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.header.run.runButton',
  {
    defaultMessage: 'Run',
  }
);

export const RUN_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.header.run.runButtonTooltip',
  {
    defaultMessage: 'Run ad-hoc Attack discoveries using your current settings',
  }
);

export const DISABLED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.header.run.disabledButtonTooltip',
  {
    defaultMessage: 'To run ad-hoc Attack discoveries, select a connector in settings',
  }
);
