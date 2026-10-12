/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { BriefEntity } from '../../../../../common/entity_analytics/executive_brief/evidence';

/** A pre-filled AI Agent chat: an instruction followed by the evidence as Markdown. */
export interface TriageRequest {
  instruction: string;
  evidenceMarkdown: string;
}

/**
 * Actions the brief's presentational components can trigger. The flyout provides them;
 * a future print layout can omit the provider, and components then render no action controls.
 */
export interface BriefActions {
  /** Undefined when Agent Builder isn't available; triage buttons are then hidden. */
  triage?: (request: TriageRequest) => void;
  openEntity: (entity: BriefEntity) => void;
  /** Scrolls to and expands a threat card (1-based rank). */
  openThreat: (rank: number) => void;
}

const BriefActionsContext = createContext<BriefActions | undefined>(undefined);

export const BriefActionsProvider = BriefActionsContext.Provider;

/** Returns undefined outside a provider (e.g. print), so callers hide their controls. */
export const useBriefActions = (): BriefActions | undefined => useContext(BriefActionsContext);
