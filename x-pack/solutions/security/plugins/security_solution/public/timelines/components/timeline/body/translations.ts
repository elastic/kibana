/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ATTACH_ALERT_TO_CASE_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.timeline.body.actions.attachAlertToCaseForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage:
      'Attach the alert or event in row {ariaRowindex} to a case, with columns {columnValues}',
  });
