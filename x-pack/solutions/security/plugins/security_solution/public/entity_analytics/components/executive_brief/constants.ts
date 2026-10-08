/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** localStorage key holding a JSON ExecutiveBriefJob to render without calling the API (PoC dev affordance). */
export const EXECUTIVE_BRIEF_FIXTURE_STORAGE_KEY = 'executiveBrief.fixture';

/** Telemetry / flyout scope id for entity badges opened from the brief. */
export const EXECUTIVE_BRIEF_SCOPE_ID = 'entity-analytics-executive-brief';

/** DOM ids of the section containers. Lane 7 (PDF export) captures one image per id, in order. */
export const EXECUTIVE_BRIEF_SECTION_IDS = {
  header: 'executiveBriefHeader',
  atAGlance: 'executiveBriefAtAGlance',
  storylines: 'executiveBriefStorylines',
  blindSpots: 'executiveBriefBlindSpots',
  decisions: 'executiveBriefDecisions',
  details: 'executiveBriefDetails',
} as const;

/** Id of the scrollable flyout body that wraps all sections. */
export const EXECUTIVE_BRIEF_BODY_ID = 'executiveBriefBody';

export const MAX_TIMELINE_EVENTS_SHOWN = 12;
