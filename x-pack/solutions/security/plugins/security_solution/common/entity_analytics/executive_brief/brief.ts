/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Assessments, Fact } from '../../api/entity_analytics/executive_brief/common.gen';

export type AssessmentKey = keyof Assessments;

/** The assessments a brief may hold, in display order. */
export const ASSESSMENT_KEYS: readonly AssessmentKey[] = ['threats', 'response'];

/**
 * Prose mentions an entity as `{{ entity.id <euid> }}`: Attack Discovery's `{{ field value }}`
 * syntax, keyed by EUID so it names exactly one Entity Store entity. Resolve the display name
 * from the entities that come with the brief.
 */
export const ENTITY_MENTION_FIELD = 'entity.id';

/**
 * Maximum visible lengths of the brief's prose fields, counting a mention as its display name;
 * longer AI output is trimmed server-side.
 */
export const BRIEF_TEXT_LIMITS = {
  verdictHeadline: 160,
  verdictSummary: 700,
  assessmentSummary: 200,
} as const;

/** Mention tokens are longer than the names they show, so raw prose is bounded more loosely. */
export const rawTextLimit = (visibleLimit: number): number => visibleLimit * 4;

/** Most fact ids one assessment may cite. */
export const MAX_CITED_IDS = 24;

/** True when any signal found something; without findings the AI is not called. */
export const hasFindings = ({ facts }: { facts: Fact[] }): boolean => facts.length > 0;
