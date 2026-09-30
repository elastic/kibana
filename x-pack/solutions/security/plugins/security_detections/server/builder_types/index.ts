/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builder type definitions for detection rules.
 *
 * These definitions are registered with the Alerting v2 framework via
 * `registerBuilderType` at plugin setup.  Each carries a field schema,
 * optional extra validation, a query compile function, and an event
 * enrichment hook.  None carries a manifest — storage reaches the framework
 * on its own path through @kbn/security-detection-rule-builder-fields.
 *
 * Ref: builder-type-registration-redesign.md "Where every artifact lives"
 *      builder-type-registration-redesign.md "The registration contract"
 */

export { securityDetectionQuery } from './custom_query';
export { securityDetectionThreshold } from './threshold_definition';
