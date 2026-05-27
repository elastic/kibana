/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftStatus } from '../nightshift_state';

/**
 * Attachment type identifier registered with the Agent Builder
 * attachments service. Kept in a leaf module so hooks such as
 * `useStartNightshiftConversation` can import it without pulling in page
 * components (avoids a circular dependency through NightshiftMorning).
 */
export const NIGHTSHIFT_AGENT_BRIEF_TYPE = 'nightshift.agentBrief' as const;

/**
 * Payload carried by a Nightshift Agent Brief attachment. The `mode`
 * decides which Nightshift panel renders inside the canvas.
 */
export interface NightshiftAgentBriefData extends Record<string, unknown> {
  mode: NightshiftStatus;
}
