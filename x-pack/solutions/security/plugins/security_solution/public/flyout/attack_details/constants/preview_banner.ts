/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Banner shown at the top of the legacy expandable-flyout attack-details
 * preview panel. Imported by the preview panel wrapper and by other
 * surfaces that open the preview panel (e.g. `correlations_details`).
 */
export const ATTACK_PREVIEW_BANNER = {
  title: i18n.translate('xpack.securitySolution.flyout.right.attack.attackPreviewTitle', {
    defaultMessage: 'Preview attack details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};
