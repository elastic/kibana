/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Tooltip label for a compact id chip — shows the field name and full value so the user can read
 * the complete identifier without having to open the alert or copy the value.
 */
export const getIdChipTooltip = (fieldName: string, fieldValue: string): string =>
  i18n.translate('xpack.securitySolution.attackDiscovery.fieldMarkdownRenderer.idChipTooltip', {
    defaultMessage: '{fieldName}: {fieldValue}',
    values: { fieldName, fieldValue },
  });

/**
 * Screen-reader label for a clickable alert-id chip — announces the full alert id so assistive
 * technologies don't read out the abbreviated label.
 */
export const getAlertIdChipAriaLabel = (alertId: string): string =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.fieldMarkdownRenderer.alertIdChipAriaLabel',
    {
      defaultMessage: 'Open alert {alertId}',
      values: { alertId },
    }
  );
