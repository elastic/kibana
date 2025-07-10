/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Anonymization Fields
 */
export const ANONYMIZATION_FIELDS_RESOURCE = 'anonymization-fields' as const;
export const ANONYMIZATION_FIELDS_COMPONENT_TEMPLATE =
  `component-template-${ANONYMIZATION_FIELDS_RESOURCE}` as const;
export const ANONYMIZATION_FIELDS_INDEX_PATTERN = `${ANONYMIZATION_FIELDS_RESOURCE}*` as const;
export const ANONYMIZATION_FIELDS_INDEX_TEMPLATE =
  `index-template-${ANONYMIZATION_FIELDS_RESOURCE}` as const;
