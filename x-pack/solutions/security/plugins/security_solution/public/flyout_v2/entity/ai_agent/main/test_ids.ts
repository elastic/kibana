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
  lastSeen: `${PREFIX}LastSeen`,
  tabs: `${PREFIX}Tabs`,
  attribution: `${PREFIX}Attribution`,
  person: `${PREFIX}Person`,
  personWatchlists: `${PREFIX}PersonWatchlists`,
  entityStatus: `${PREFIX}EntityStatus`,
  hostAlerts: `${PREFIX}HostAlerts`,
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
  launchBadge: `${PREFIX}LaunchBadge`,
  toolCallProcesses: `${PREFIX}ToolCallProcesses`,
  noProcessActivity: `${PREFIX}NoProcessActivity`,
  otelByAccount: `${PREFIX}OtelByAccount`,
  graph: `${PREFIX}Graph`,
} as const;
