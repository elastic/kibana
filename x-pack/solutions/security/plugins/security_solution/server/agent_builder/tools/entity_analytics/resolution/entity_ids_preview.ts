/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedEntityResult } from './resolve_entity_ids';

const ENTITY_PREVIEW_LIMIT = 10;

/**
 * Render an EUID list for a HITL confirmation message body. For lists at or
 * under {@link ENTITY_PREVIEW_LIMIT} entries, all ids are shown. Beyond that
 * the first {@link ENTITY_PREVIEW_LIMIT} are shown with an "...and N more" suffix
 */
export const formatEntityIdsForPrompt = (entityIds: readonly string[]): string => {
  if (entityIds.length <= ENTITY_PREVIEW_LIMIT) {
    return `**Entities:** ${entityIds.join(', ')}`;
  }
  const head = entityIds.slice(0, ENTITY_PREVIEW_LIMIT).join(', ');
  const remaining = entityIds.length - ENTITY_PREVIEW_LIMIT;
  return `**Entities (first ${ENTITY_PREVIEW_LIMIT}):** ${head} … and ${remaining} more`;
};

/**
 * Render EUIDs alongside the resolution group target each one is currently linked to,
 * so the user confirms against the group actually being modified rather than the alias
 * name alone. Entities without a `resolvedTo` are not aliases and are marked as such —
 * they will be skipped by the unlink.
 */
export const formatUnlinkTargetsForPrompt = (entities: readonly ResolvedEntityResult[]): string => {
  const shown = entities.slice(0, ENTITY_PREVIEW_LIMIT);
  const lines = shown.map((entity) => {
    const target = entity.resolvedTo;
    return target
      ? `- \`${entity.euid}\` — currently linked to \`${target}\``
      : `- \`${entity.euid}\` — not currently linked to anything (will be skipped)`;
  });

  const remaining = entities.length - shown.length;
  if (remaining > 0) {
    lines.push(`- … and ${remaining} more`);
  }
  return lines.join('\n');
};
