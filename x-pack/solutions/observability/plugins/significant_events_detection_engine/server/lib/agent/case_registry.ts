/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IOpenEventSearch } from './open_event_search';

/**
 * The cases the agent is assessing right now. Agent Builder gives a tool only the request, so
 * the case id the prompt carries is how the tool finds the run that asked.
 */
export interface ICaseRegistry {
  /** Registers a case for the length of one agent call; `release` forgets it. */
  register(search: IOpenEventSearch): { caseId: string; release: () => void };
  /** The search of a case being assessed, or undefined for an unknown or finished case. */
  get(caseId: string): IOpenEventSearch | undefined;
}

export function createCaseRegistry(): ICaseRegistry {
  const cases = new Map<string, IOpenEventSearch>();
  return {
    register(search) {
      const caseId = uuidv4();
      cases.set(caseId, search);
      return { caseId, release: () => cases.delete(caseId) };
    },
    get: (caseId) => cases.get(caseId),
  };
}
