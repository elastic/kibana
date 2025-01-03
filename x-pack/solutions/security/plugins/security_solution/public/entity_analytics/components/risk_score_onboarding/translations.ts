/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { getRiskEntityTranslation } from '../risk_score/translations';

export const BETA = i18n.translate('xpack.securitySolution.riskScore.technicalPreviewLabel', {
  defaultMessage: 'Beta',
});

export const RESTART_TOOLTIP = i18n.translate(
  'xpack.securitySolution.riskScore.usersDashboardRestartTooltip',
  {
    defaultMessage:
      'The risk score calculation might take a while to run. However, by pressing restart, you can force it to run immediately.',
  }
);

export const RISK_DATA_TITLE = (riskEntity: EntityType) =>
  i18n.translate('xpack.securitySolution.alertDetails.overview.hostRiskDataTitle', {
    defaultMessage: '{riskEntity} Risk Data',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
    },
  });
