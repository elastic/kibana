/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import {
  BRIEF_TEXT_LIMITS,
  ENTITY_MENTION_FIELD,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import { entityDisplayName, entityTypeOf } from '../entity_record';
import type { EvidenceIndex } from './evidence_index';
import { unique } from './evidence_index';
import type { BriefCheck, CheckOutcome } from './types';
import {
  assessmentPath,
  emptyOutcome,
  isDropped,
  listClaims,
  mapAssessments,
  reportClaim,
} from './types';

/** A `{{ field value }}` token (Attack Discovery's syntax). */
const MENTION_PATTERN = /\{\{\s*([\w.]+)\s+([^{}]*?)\s*\}\}/g;

/** An unclosed token at the end of a field, left by trimming. */
const DANGLING_MENTION_PATTERN = /\{\{\s*(?:[\w.]+\s+)?([^{}]*)$/;

const NAME_FIELD_BY_TYPE = {
  user: 'user.name',
  host: 'host.name',
  service: 'service.name',
  generic: 'entity.name',
} as const;

export const toMention = (euid: string): string => `{{ ${ENTITY_MENTION_FIELD} ${euid} }}`;

/** A canonical mention, as written by `toMention`. */
const CANONICAL_MENTION_PATTERN = /\{\{ entity\.id ([^{}]+?) \}\}/g;

/**
 * Trims prose to `max` visible characters, counting a mention as its display name. Cuts at a word
 * boundary and never inside a mention.
 */
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

  if (parts.reduce((total, { visible }) => total + visible, 0) <= max) {
    return text;
  }
  let room = max - 1;
  let kept = '';
  for (const part of parts) {
    if (part.visible > room) {
      if (!part.mention) {
        const cut = part.raw.slice(0, room);
        const lastSpace = cut.lastIndexOf(' ');
        kept += lastSpace > 0 ? cut.slice(0, lastSpace) : '';
      }
      break;
    }
    kept += part.raw;
    room -= part.visible;
  }
  return `${kept.replace(/[\s,;:.-]+$/, '')}…`;
};

/** EUIDs by `"<name field> <display name>"`, for upgrading name-based tokens. */
const indexByName = (index: EvidenceIndex): Map<string, string[]> => {
  const byName = new Map<string, string[]>();
  index.entities.forEach((record, euid) => {
    const key = `${NAME_FIELD_BY_TYPE[entityTypeOf(record, euid)]} ${entityDisplayName(
      record,
      euid
    )}`;
    byName.set(key, [...(byName.get(key) ?? []), euid]);
  });
  return byName;
};

/**
 * Mentions: prose refers to entities as `{{ entity.id <euid> }}`. A token naming an EUID that is
 * not in the evidence fails its claim, like an invented id. A name-based token
 * (`{{ host.name web-01 }}`) is upgraded when exactly one evidence entity matches; other tokens
 * become plain text, and a token cut off by trimming is removed. Prose is then trimmed to its
 * visible limit.
 */
export const checkMentions: BriefCheck = (input, context): CheckOutcome => {
  const { index } = context;
  const byName = indexByName(index);
  const unlinked: string[] = [];
  const unknown = new Map<string, string[]>();

  const resolve = (path: string, text: string): string =>
    text
      .replace(MENTION_PATTERN, (token, field: string, value: string) => {
        if (field === ENTITY_MENTION_FIELD) {
          if (index.entities.has(value)) {
            return toMention(value);
          }
          unknown.set(path, [...(unknown.get(path) ?? []), value]);
          return token;
        }
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

  const nameOf = (euid: string): string => {
    const record = index.entities.get(euid);
    return record ? entityDisplayName(record, euid) : euid;
  };

  const prose = (path: string, text: string, max: number): string =>
    clampVisible(resolve(path, text), max, nameOf);

  const brief: Brief = {
    verdict: {
      ...input.verdict,
      headline: prose('verdict', input.verdict.headline, BRIEF_TEXT_LIMITS.verdictHeadline),
      summary: prose('verdict', input.verdict.summary, BRIEF_TEXT_LIMITS.verdictSummary),
    },
    assessments: mapAssessments(input.assessments, (assessment, key) => ({
      ...assessment,
      summary: prose(assessmentPath(key), assessment.summary, BRIEF_TEXT_LIMITS.assessmentSummary),
    })),
  };

  const outcome = emptyOutcome(brief);
  if (unlinked.length > 0) {
    outcome.notes.push(`unlinked mentions: ${unique(unlinked).join(', ')}`);
  }
  listClaims(brief, context).forEach((claim) => {
    const euids = unknown.get(claim.path ?? 'verdict');
    if (!euids || isDropped(context, claim.path)) {
      return;
    }
    reportClaim(
      outcome,
      claim,
      'citation',
      `its text mentions entities that are not in the evidence: ${unique(euids).join(', ')}`
    );
  });
  return outcome;
};
