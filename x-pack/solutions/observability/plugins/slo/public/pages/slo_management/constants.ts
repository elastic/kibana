/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SLOHealthStatus } from '@kbn/slo-schema';

export function toSloHealthStatus(status: SLOHealthStatus) {
  switch (status) {
    case 'healthy':
      return i18n.translate('xpack.slo.slo.healthStatus.healthy', {
        defaultMessage: 'Healthy',
      });
    case 'degraded':
      return i18n.translate('xpack.slo.slo.healthStatus.degraded', {
        defaultMessage: 'Degraded',
      });
    case 'failed':
    default:
      return i18n.translate('xpack.slo.slo.healthStatus.failed', {
        defaultMessage: 'Failed',
      });
  }
}
