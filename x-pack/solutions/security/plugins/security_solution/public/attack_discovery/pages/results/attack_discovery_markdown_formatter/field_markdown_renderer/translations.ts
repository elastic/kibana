/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Screen-reader label that announces the full alert id instead of the truncated value. */
export const getAlertIdAriaLabel = (alertId: string): string =>
  i18n.translate('xpack.securitySolution.attackDiscovery.fieldMarkdownRenderer.alertIdAriaLabel', {
    defaultMessage: 'Open alert {alertId}',
    values: { alertId },
  });
