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

/**
 * PDF capture blocks. Every element carrying this attribute is captured as one image, in DOM
 * order; blocks are never split across pages unless taller than a page. The attribute value is a
 * label; `data-brief-keep-with-next` asks the layout to keep a block on the same page as the next.
 */
export const BRIEF_BLOCK_ATTRIBUTE = 'data-brief-block';
export const BRIEF_KEEP_WITH_NEXT_ATTRIBUTE = 'data-brief-keep-with-next';

/** Attribute set on the flyout body wrapper (value "true") while the PDF is captured. */
export const BRIEF_PRINT_MODE_ATTRIBUTE = 'data-print-mode';

/** Id of the scrollable flyout body that wraps all sections. */
export const EXECUTIVE_BRIEF_BODY_ID = 'executiveBriefBody';

export const MAX_TIMELINE_EVENTS_SHOWN = 12;
