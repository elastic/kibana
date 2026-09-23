/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Canonical severity levels shared by the attachment zod schemas and renderers. */
export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

/** Canonical Diamond Model vertices shared by the threat and hunt correlation schemas/renderers. */
export const DIAMOND_VERTICES = ['adversary', 'capability', 'infrastructure', 'victim'] as const;
export type DiamondVertex = (typeof DIAMOND_VERTICES)[number];
