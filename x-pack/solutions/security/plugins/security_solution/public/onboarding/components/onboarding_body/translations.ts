/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CARD_COMPLETE_BADGE = i18n.translate(
  'xpack.securitySolution.onboarding.cardComplete',
  {
    defaultMessage: 'Completed',
  }
);

export const EXPAND_CARD_BUTTON_LABEL = (title: string) =>
  i18n.translate('xpack.securitySolution.onboarding.expandCardButtonAriaLabel', {
    defaultMessage: 'Expand "{title}"',
    values: { title },
  });
