/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The framework-aware builder lives in the shared MITRE package so other plugins
// (for example alertzero) resolve the same URLs. This module keeps existing import
// paths within security_solution stable.
export { buildMitreReferenceUrl } from '@kbn/security-mitre-attack-common';
