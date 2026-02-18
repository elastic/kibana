/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATE_DISPLAY_FORMAT = 'MMM D YYYY @ HH:mm';

export const DATE_DISPLAY_FORMAT_WITH_SECONDS = 'MMM D YYYY @ HH:mm:ss';

export const IGNORED_FIELDS = [
  'attributes.updatedAt',
  'attributes.revision',
  'attributes.params.meta.kibana_siem_app_url',
  'attributes.params.timestampOverrideFallbackDisabled',
  'attributes.params.ruleSource.isCustomized',
  'attributes.params.ruleSource.customizedFields',
];
