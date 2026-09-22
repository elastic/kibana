/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Allowlisted ECS fields for SSE `entities[]`.
 * The field written is the field Discover queries. No EUID/ARN decoding.
 */
export const ATTACHMENT_ENTITY_FIELDS = [
  'user.name',
  'user.email',
  'user.id',
  'host.name',
  'host.hostname',
  'host.id',
  'service.name',
  'service.id',
] as const;
