/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection rule field schemas for the security_detections plugin.
 *
 * These schemas live in the plugin's common/ so both the server routes and
 * the browser rule form can import them from one place.
 *
 * The note and setup bounds here are raised relative to the old shared package
 * (deleted in step B.10):
 *   - note: 65,536 characters (was 8,192)
 *   - setup: 16,384 characters (was 8,192)
 *
 * Ref: builder-type-registration-redesign.md "Where every artifact lives"
 *      builder-type-registration-redesign.md "Long text fields and the string ceiling"
 */

export type { DetectionRuleCommonFields } from './detection_rule_common_fields';
export {
  threatTacticSchema,
  threatSubtechniqueSchema,
  threatTechniqueSchema,
  threatEntrySchema,
  detectionRuleCommonFields,
} from './detection_rule_common_fields';

export type { CustomQueryBuilderFields } from './custom_query';
export { customQueryBuilderFieldsSchema } from './custom_query';

export type { ThresholdBuilderFields } from './threshold_builder_fields';
export { thresholdBuilderFieldsSchema } from './threshold_builder_fields';
