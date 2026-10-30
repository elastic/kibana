/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Which investigation each in-flight reinforcement run works for. A run has a conversation of its
 * own, so its tools cannot see the investigation's id; the reinforce step registers it for the
 * length of the run, and the submit tool stamps it on the versions it commits.
 */
export interface ReinforcementRunRegistry {
  /** Returns the function that removes the entry once the run is over. */
  register: (runConversationId: string, investigationId: string) => () => void;
  getInvestigationId: (runConversationId: string) => string | undefined;
}

export const createReinforcementRunRegistry = (): ReinforcementRunRegistry => {
  const investigationByRun = new Map<string, string>();
  return {
    register: (runConversationId, investigationId) => {
      investigationByRun.set(runConversationId, investigationId);
      return () => {
        investigationByRun.delete(runConversationId);
      };
    },
    getInvestigationId: (runConversationId) => investigationByRun.get(runConversationId),
  };
};
