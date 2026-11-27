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
  headerWatchlist: `${PREFIX}HeaderWatchlist`,
  lastSeen: `${PREFIX}LastSeen`,
  tabs: `${PREFIX}Tabs`,
  attribution: `${PREFIX}Attribution`,
  person: `${PREFIX}Person`,
  personSignals: `${PREFIX}PersonSignals`,
  otherAccounts: `${PREFIX}OtherAccounts`,
  noSignedInAccount: `${PREFIX}NoSignedInAccount`,
  host: `${PREFIX}Host`,
  runsAs: `${PREFIX}RunsAs`,
  sharedAccountLink: `${PREFIX}SharedAccountLink`,
  relatedAgents: `${PREFIX}RelatedAgents`,
  relatedAgentsToggle: `${PREFIX}RelatedAgentsToggle`,
  sameAccount: `${PREFIX}SameAccount`,
  sameHost: `${PREFIX}SameHost`,
  installDetails: `${PREFIX}InstallDetails`,
  installDetailsToggle: `${PREFIX}InstallDetailsToggle`,
  copyEntityId: `${PREFIX}CopyEntityId`,
  alerts: `${PREFIX}Alerts`,
  alertsNone: `${PREFIX}AlertsNone`,
  alertsCount: `${PREFIX}AlertsCount`,
  alertsShowAll: `${PREFIX}AlertsShowAll`,
  activity: `${PREFIX}Activity`,
  run: `${PREFIX}Run`,
  step: `${PREFIX}Step`,
  unplacedSteps: `${PREFIX}UnplacedSteps`,
  setupToggle: `${PREFIX}SetupToggle`,
  sessionViewLink: `${PREFIX}SessionViewLink`,
  headlessPrompt: `${PREFIX}HeadlessPrompt`,
  missingDefend: `${PREFIX}MissingDefend`,
  otelByAccount: `${PREFIX}OtelByAccount`,
  graph: `${PREFIX}Graph`,
} as const;
