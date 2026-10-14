/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { AssessmentKey } from '../../../../../common/entity_analytics/executive_brief/brief';
import {
  BRIEF_TEXT_LIMITS,
  ENTITY_MENTION_FIELD,
  rawTextLimit,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import { entityDisplayName, entityTypeOf } from '../signals/engine/entity_record';
import type { CheckContext } from './verify';

/** A `{{ field value }}` token (Attack Discovery's syntax). */
export const MENTION_PATTERN = /\{\{\s*([\w.]+)\s+([^{}]*?)\s*\}\}/g;

/** An unclosed token at the end of a field, left by trimming. */
const DANGLING_MENTION_PATTERN = /\{\{\s*(?:[\w.]+\s+)?([^{}]*)$/;

/** A canonical mention, as written by `toMention`. */
const CANONICAL_MENTION_PATTERN = /\{\{ entity\.id ([^{}]+?) \}\}/g;

const NAME_FIELD_BY_TYPE = {
  user: 'user.name',
  host: 'host.name',
  service: 'service.name',
  generic: 'entity.name',
} as const;

export const toMention = (euid: string): string => `{{ ${ENTITY_MENTION_FIELD} ${euid} }}`;

/** Trims to `max` visible and `rawTextLimit(max)` raw characters, at a word boundary, never inside a mention. */
export const clampVisible = (
  text: string,
  max: number,
  nameOf: (euid: string) => string
): string => {
  const parts: Array<{ raw: string; visible: number; mention: boolean }> = [];
  let last = 0;
  for (const match of text.matchAll(CANONICAL_MENTION_PATTERN)) {
    const start = match.index ?? 0;
    parts.push({ raw: text.slice(last, start), visible: start - last, mention: false });
    parts.push({ raw: match[0], visible: nameOf(match[1]).length, mention: true });
    last = start + match[0].length;
  }
  parts.push({ raw: text.slice(last), visible: text.length - last, mention: false });

  const maxRaw = rawTextLimit(max);
  if (text.length <= maxRaw && parts.reduce((total, { visible }) => total + visible, 0) <= max) {
    return text;
  }
  let room = max - 1;
  let rawRoom = maxRaw - 1;
  let kept = '';
  for (const part of parts) {
    if (part.visible > room || part.raw.length > rawRoom) {
      if (!part.mention) {
        const cut = part.raw.slice(0, Math.min(room, rawRoom));
        kept += cut.slice(0, Math.max(cut.lastIndexOf(' '), 0));
      }
      break;
    }
    kept += part.raw;
    room -= part.visible;
    rawRoom -= part.raw.length;
  }
  return `${kept.replace(/[\s,;:.-]+$/, '')}…`;
};

/** Upgrades or unlinks mentions, fails a claim that mentions an unknown EUID, and trims the prose. */
export const checkMentions = (context: CheckContext): void => {
  const { brief, entities } = context;
  const nameOf = (euid: string): string => {
    const record = entities.get(euid);
    return record ? entityDisplayName(record, euid) : euid;
  };
  // EUIDs by `<name field> <display name>`, for upgrading name-based tokens.
  const byName = new Map<string, string[]>();
  entities.forEach((record, euid) => {
    const key = `${NAME_FIELD_BY_TYPE[entityTypeOf(record, euid)]} ${nameOf(euid)}`;
    byName.set(key, [...(byName.get(key) ?? []), euid]);
  });
  const unlinked: string[] = [];
  const unknown = new Map<AssessmentKey | undefined, string[]>();

  const prose = (key: AssessmentKey | undefined, text: string, max: number): string => {
    const resolved = text
      .replace(MENTION_PATTERN, (token, field: string, value: string) => {
        if (field === ENTITY_MENTION_FIELD && entities.has(value)) {
          return toMention(value);
        }
        if (field === ENTITY_MENTION_FIELD) {
          unknown.set(key, [...(unknown.get(key) ?? []), value]);
          return token;
        }
        // A name token naming exactly one entity becomes its EUID token; others become plain text.
        const matches = byName.get(`${field} ${value}`) ?? [];
        if (matches.length === 1) {
          return toMention(matches[0]);
        }
        unlinked.push(token);
        return value;
      })
      .replace(DANGLING_MENTION_PATTERN, (token) => {
        unlinked.push(token);
        return '…';
      })
      .replace(/\s+…$/, '…');
    return clampVisible(resolved, max, nameOf);
  };

  const { verdict } = brief;
  verdict.headline = prose(undefined, verdict.headline, BRIEF_TEXT_LIMITS.verdictHeadline);
  verdict.summary = prose(undefined, verdict.summary, BRIEF_TEXT_LIMITS.verdictSummary);
  for (const [key, assessment] of context.assessments()) {
    assessment.summary = prose(key, assessment.summary, BRIEF_TEXT_LIMITS.assessmentSummary);
  }
  unknown.forEach((euids, key) =>
    context.fail(
      key,
      'citation',
      `its text mentions entities that are not in the evidence: ${uniq(euids).join(', ')}`
    )
  );
  if (unlinked.length > 0) {
    context.notes.push(`unlinked mentions: ${uniq(unlinked).join(', ')}`);
  }
};
