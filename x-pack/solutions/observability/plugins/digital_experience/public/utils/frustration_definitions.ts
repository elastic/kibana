/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * What EDOT Browser reports as each frustration signal. Kept out of `labels.ts`, which the plugin
 * entry loads on every page.
 */
export const FRUSTRATION_DEFINITIONS = {
  rage: i18n.translate('xpack.digitalExperience.overview.frustration.rageDefinition', {
    defaultMessage: 'Rage click: 3 or more clicks on the same element within 1 second.',
  }),
  dead: i18n.translate('xpack.digitalExperience.overview.frustration.deadDefinition', {
    defaultMessage:
      'Dead click: a click on a link, a button or another clickable-looking element with no page reaction within 1 second.',
  }),
  error: i18n.translate('xpack.digitalExperience.overview.frustration.errorDefinition', {
    defaultMessage:
      'Error click: a click followed by an uncaught JavaScript error, within 1 second or after a slow request it started.',
  }),
};
