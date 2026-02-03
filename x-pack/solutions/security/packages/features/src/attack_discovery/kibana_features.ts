/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { i18n } from '@kbn/i18n';
import { ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '@kbn/elastic-assistant-common/constants';

import { APP_ID, ATTACK_DISCOVERY_FEATURE_ID, SERVER_APP_ID } from '../constants';
import { type BaseKibanaFeatureConfig } from '../types';

const alertingFeatures = [
  {
    ruleTypeId: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
    consumers: [SERVER_APP_ID],
  },
];

export const getAttackDiscoveryBaseKibanaFeature = (): BaseKibanaFeatureConfig => ({
  id: ATTACK_DISCOVERY_FEATURE_ID,
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionAttackDiscoveryTitle',
    {
      defaultMessage: 'Attack discovery',
    }
  ),
  order: 1400,
  category: DEFAULT_APP_CATEGORIES.security,
  app: [ATTACK_DISCOVERY_FEATURE_ID, 'kibana'],
  catalogue: [APP_ID],
  minimumLicense: 'enterprise',
  alerting: alertingFeatures,
  privileges: {
    all: {
      api: ['elasticAssistant'], // only required by legacy internal API routes authz
      app: [ATTACK_DISCOVERY_FEATURE_ID, 'kibana'],
      catalogue: [APP_ID],
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        rule: { read: alertingFeatures },
        alert: { all: alertingFeatures },
      },
      ui: [],
    },
    read: {
      // No read-only mode currently supported
      disabled: true,
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        rule: { read: alertingFeatures },
        alert: { all: alertingFeatures },
      },
      ui: [],
    },
  },
});
