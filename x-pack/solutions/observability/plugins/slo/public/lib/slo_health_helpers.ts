/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export function getSloHealthStateText(hasUnhealthy: boolean, hasMissing: boolean) {
  if (hasUnhealthy && hasMissing) {
    return i18n.translate('xpack.slo.sloHealth.unhealthyOrMissingState', {
      defaultMessage: 'an unhealthy or missing',
    });
  } else if (hasUnhealthy) {
    return i18n.translate('xpack.slo.sloHealth.unhealthyState', {
      defaultMessage: 'an unhealthy',
    });
  } else {
    return i18n.translate('xpack.slo.sloHealth.missingState', {
      defaultMessage: 'a missing',
    });
  }
}
