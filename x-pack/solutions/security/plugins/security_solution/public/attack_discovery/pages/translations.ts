/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CONNECTOR_ERROR = i18n.translate(
  'xpack.securitySolution.attackDiscovery.errorConnector',
  {
    defaultMessage: 'No connector selected, select a connector to use attack discovery',
  }
);

export const ERROR_GENERATING_ATTACK_DISCOVERIES = i18n.translate(
  'xpack.securitySolution.attackDiscovery.errorGeneratingAttackDiscoveriesToastTitle',
  {
    defaultMessage: 'Error generating attack discoveries',
  }
);

export const SHOW_ANONYMIZED_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.showAnonymizedLabel',
  {
    defaultMessage: 'Show anonymized values',
  }
);

export const ANONYMIZATION_ARIAL_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.anonymizationArialLabel',
  {
    defaultMessage: 'Anonymization',
  }
);
