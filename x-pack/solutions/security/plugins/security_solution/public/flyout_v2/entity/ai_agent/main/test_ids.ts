/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PREFIX = 'aiAgentFlyout';

export const AI_AGENT_TEST_IDS = {
  header: `${PREFIX}Header`,
  riskBadge: `${PREFIX}RiskBadge`,
  noScoreBadge: `${PREFIX}NoScoreBadge`,
  tabs: `${PREFIX}Tabs`,
  person: `${PREFIX}Person`,
  personNotFound: `${PREFIX}PersonNotFound`,
  actsForNone: `${PREFIX}ActsForNone`,
  host: `${PREFIX}Host`,
  runsAs: `${PREFIX}RunsAs`,
  otherInstalls: `${PREFIX}OtherInstalls`,
  alerts: `${PREFIX}Alerts`,
  alertsNone: `${PREFIX}AlertsNone`,
  activity: `${PREFIX}Activity`,
  run: `${PREFIX}Run`,
  step: `${PREFIX}Step`,
  unplacedSteps: `${PREFIX}UnplacedSteps`,
  setupToggle: `${PREFIX}SetupToggle`,
  sessionViewLink: `${PREFIX}SessionViewLink`,
  headlessPrompt: `${PREFIX}HeadlessPrompt`,
  gapLink: `${PREFIX}GapLink`,
  mockBadge: `${PREFIX}MockBadge`,
  personMfa: `${PREFIX}PersonMfa`,
  personHr: `${PREFIX}PersonHr`,
  personIdp: `${PREFIX}PersonIdp`,
  alertsCount: `${PREFIX}AlertsCount`,
  missingDefend: `${PREFIX}MissingDefend`,
  missingSessionId: `${PREFIX}MissingSessionId`,
  missingToolCalls: `${PREFIX}MissingToolCalls`,
  missingPrompts: `${PREFIX}MissingPrompts`,
  missingInteractivePrompt: `${PREFIX}MissingInteractivePrompt`,
  otelByAccount: `${PREFIX}OtelByAccount`,
  graph: `${PREFIX}Graph`,
  headerWatchlists: `${PREFIX}HeaderWatchlists`,
  personWatchlists: `${PREFIX}PersonWatchlists`,
  storeContext: `${PREFIX}StoreContext`,
  storeContextMissing: `${PREFIX}StoreContextMissing`,
  storeContextWatchlists: `${PREFIX}StoreContextWatchlists`,
  storeContextMfa: `${PREFIX}StoreContextMfa`,
  storeContextUpdated: `${PREFIX}StoreContextUpdated`,
} as const;
