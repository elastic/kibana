/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Imperative bridge so the rules-list empty state can drive MixedCreateRuleSession. */
export type MixedCreateSessionApi = {
  openChooser: () => void;
  openEsql: () => void;
  openThreshold: () => void;
  openAgent: (userInput?: string, esqlQuery?: string) => void;
  openSequence: () => void;
  browseClassic: (search?: string) => void;
  exploreLibrary: () => void;
  selectClassicRuleType: (ruleTypeId: string) => void;
};

let sessionApi: MixedCreateSessionApi | undefined;

export const setMixedCreateSessionApi = (api: MixedCreateSessionApi | undefined): void => {
  sessionApi = api;
};

export const getMixedCreateSessionApi = (): MixedCreateSessionApi | undefined => sessionApi;
