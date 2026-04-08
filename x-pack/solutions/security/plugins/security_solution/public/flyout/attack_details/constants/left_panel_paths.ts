/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Top-level left panel tab: Insights (Entities + Correlation sub-tabs). */
export const INSIGHTS_TAB_ID = 'insights' as const;

/** Top-level left panel tab: Notes. */
export const NOTES_TAB_ID = 'notes' as const;

/** Insights sub-tab: Entities (related users and hosts). */
export const ENTITIES_TAB_ID = 'entity' as const;

/** Insights sub-tab: Correlation (related alerts table). */
export const CORRELATION_TAB_ID = 'correlation' as const;

/** Union of top-level left panel tab ids. */
export type LeftPanelPaths = typeof INSIGHTS_TAB_ID | typeof NOTES_TAB_ID;
