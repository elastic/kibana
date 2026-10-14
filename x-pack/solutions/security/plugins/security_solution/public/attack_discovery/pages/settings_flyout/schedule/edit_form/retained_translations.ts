/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// Retention-only i18n definition. `fieldConnectorIdHelpText` is no longer rendered
// (its helpText was dropped from schema.tsx). Keeping it defined here prevents
// i18n_check from orphaning its de/fr/ja/zh translations, which would force deleting
// them from localization-owned files and require @elastic/kibana-localization review.
export const RETAINED_FIELD_CONNECTOR_ID_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.fieldConnectorIdHelpText',
  { defaultMessage: 'This connector will apply to this schedule, only.' }
);
