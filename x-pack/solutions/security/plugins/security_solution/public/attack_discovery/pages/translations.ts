/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_GENERATING_ATTACK_DISCOVERIES = i18n.translate(
  'xpack.securitySolution.attackDiscovery.errorGeneratingAttackDiscoveriesToastTitle',
  {
    defaultMessage: 'Error generating attack discoveries',
  }
);

export const ERROR_CANCELING_ATTACK_DISCOVERIES = i18n.translate(
  'xpack.securitySolution.attackDiscovery.errorCancelingAttackDiscoveriesToastTitle',
  {
    defaultMessage: 'Error canceling attack discoveries',
  }
);

export const CONNECTOR_ERROR = i18n.translate(
  'xpack.securitySolution.attackDiscovery.errorConnector',
  {
    defaultMessage: 'No connector selected, select a connector to use attack discovery',
  }
);

export const SHOW_REAL_VALUES = i18n.translate(
  'xpack.securitySolution.attackDiscovery.showRealValuesLabel',
  {
    defaultMessage: 'Show real values',
  }
);

export const SHOW_ANONYMIZED_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.showAnonymizedLabel',
  {
    defaultMessage: 'Show anonymized',
  }
);
