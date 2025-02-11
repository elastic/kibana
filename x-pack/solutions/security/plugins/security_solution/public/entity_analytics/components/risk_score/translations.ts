/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EntityType } from '../../../../common/entity_analytics/types';

export const HOST = i18n.translate('xpack.securitySolution.riskScore.overview.hostTitle', {
  defaultMessage: 'Host',
});

export const HOSTS = i18n.translate('xpack.securitySolution.riskScore.overview.hosts', {
  defaultMessage: 'Hosts',
});

export const USER = i18n.translate('xpack.securitySolution.riskScore.overview.userTitle', {
  defaultMessage: 'User',
});

export const USERS = i18n.translate('xpack.securitySolution.riskScore.overview.users', {
  defaultMessage: 'Users',
});

export const SERVICE = i18n.translate('xpack.securitySolution.riskScore.overview.serviceTitle', {
  defaultMessage: 'Service',
});

export const SERVICES = i18n.translate('xpack.securitySolution.riskScore.overview.services', {
  defaultMessage: 'Services',
});

export const ENTITY = i18n.translate('xpack.securitySolution.riskScore.overview.entityTitle', {
  defaultMessage: 'Entity',
});

export const ENTITIES = i18n.translate('xpack.securitySolution.riskScore.overview.entities', {
  defaultMessage: 'Entities',
});

export const RISK_SCORE_TITLE = (riskEntity: EntityType) =>
  i18n.translate('xpack.securitySolution.riskScore.overview.riskScoreTitle', {
    defaultMessage: '{riskEntity} Risk Score',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
    },
  });

export const RISK_SCORING_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.overview.riskScoringTitle',
  {
    defaultMessage: 'Entity Risk Scoring',
  }
);

export const ENTITY_RISK_LEVEL = (riskEntity?: EntityType) =>
  riskEntity
    ? i18n.translate('xpack.securitySolution.entityAnalytics.riskDashboard.riskLevelTitle', {
        defaultMessage: '{riskEntity} risk level',
        values: {
          riskEntity: getRiskEntityTranslation(riskEntity),
        },
      })
    : i18n.translate(
        'xpack.securitySolution.entityAnalytics.riskDashboard.noEntity.riskLevelTitle',
        {
          defaultMessage: 'Risk level',
        }
      );

export const getRiskEntityTranslation = (
  riskEntity?: EntityType,
  lowercase = false,
  plural = false
) => {
  const text = getRiskEntityTranslationText(riskEntity, plural);
  return lowercase ? text.toLowerCase() : text;
};

export const getRiskEntityTranslationText = (
  riskEntity: EntityType | undefined,
  plural: boolean
) => {
  switch (riskEntity) {
    case EntityType.host:
      return plural ? HOSTS : HOST;
    case EntityType.user:
      return plural ? USERS : USER;
    case EntityType.service:
      return plural ? SERVICES : SERVICE;
    default:
      return plural ? ENTITIES : ENTITY;
  }
};

export const ALERTS = i18n.translate('xpack.securitySolution.riskScore.overview.alerts', {
  defaultMessage: 'Alerts',
});
