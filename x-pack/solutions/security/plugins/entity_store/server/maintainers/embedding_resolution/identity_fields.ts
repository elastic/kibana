/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldValue } from '../../../common/domain/euid/commons';
import type { IdentityFields } from './embed';

const NAME_FIELD = 'user.name';
const FULL_NAME_FIELD = 'user.full_name';
const EMAIL_FIELD = 'user.email';

/**
 * `_source` field paths required to reconstruct an {@link IdentityFields} for
 * the user entity type. Used in both the embed query (`searchUnresolvedToEmbed`)
 * and the link-step kNN query (`collectKnnCandidates`) so that the same set of
 * fields ships back from ES regardless of which path produced the hit.
 */
export const USER_IDENTITY_SOURCE_FIELDS: readonly string[] = [
  NAME_FIELD,
  FULL_NAME_FIELD,
  EMAIL_FIELD,
];

/**
 * Reads the user identity fields (`user.name`, `user.full_name`, `user.email`)
 * out of an ES `_source` document. Tolerant of:
 *
 * - flat dotted keys (`'user.name': 'alice'`) — the LATEST index ships docs
 *   in this shape when written by entity transforms;
 * - nested objects (`{ user: { name: 'alice' } }`) — older docs and bulk
 *   _update_ payloads round-trip nested;
 * - missing or non-string values — returned as `undefined` rather than coerced
 *   so role-account heuristics and identity-string builders can early-exit on
 *   empty values.
 */
export const extractUserIdentity = (source: Record<string, unknown>): IdentityFields => ({
  name: getFieldValue(source, NAME_FIELD) ?? undefined,
  full_name: getFieldValue(source, FULL_NAME_FIELD) ?? undefined,
  email: getFieldValue(source, EMAIL_FIELD) ?? undefined,
});
