/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const journey = {
  resumeDiscovery: i18n.translate('xpack.significantEventsApp.journeys.resumeDiscovery', {
    defaultMessage: 'Resume discovery',
  }),
  pauseDiscovery: i18n.translate('xpack.significantEventsApp.journeys.pauseDiscovery', {
    defaultMessage: 'Pause discovery',
  }),
  today: i18n.translate('xpack.significantEventsApp.journeys.today', { defaultMessage: 'today' }),
  notRecorded: i18n.translate('xpack.significantEventsApp.journeys.notRecorded', {
    defaultMessage: 'Not recorded',
  }),
  historyNote: i18n.translate('xpack.significantEventsApp.journeys.historyNote', {
    defaultMessage:
      'Recorded discovery runs · UTC days. Earlier usage is unavailable until recorded.',
  }),
  zeroUnlimited: i18n.translate('xpack.significantEventsApp.journeys.zeroUnlimited', {
    defaultMessage: '0 means unlimited. The limit resets at midnight UTC.',
  }),
  confidenceThreshold: i18n.translate('xpack.significantEventsApp.journeys.confidenceThreshold', {
    defaultMessage: 'Minimum event confidence',
  }),
  confidenceHint: i18n.translate('xpack.significantEventsApp.journeys.confidenceHint', {
    defaultMessage:
      'New discovery findings below this confidence are retained as dismissed triage outcomes. Existing events keep their state. Suggested starting point: 70%.',
  }),
  reviewChanges: i18n.translate('xpack.significantEventsApp.journeys.reviewChanges', {
    defaultMessage: 'Review changes',
  }),
  limitWillPause: i18n.translate('xpack.significantEventsApp.journeys.limitWillPause', {
    defaultMessage:
      'Today’s usage meets this limit. New discovery runs will wait until midnight UTC or until you raise the limit.',
  }),
  limitWillAllow: i18n.translate('xpack.significantEventsApp.journeys.limitWillAllow', {
    defaultMessage: 'New discovery runs can continue within this daily limit.',
  }),
  pauseEffect: i18n.translate('xpack.significantEventsApp.journeys.pauseEffect', {
    defaultMessage: 'New discovery runs will pause. Existing rules continue checking telemetry.',
  }),
  resumeEffect: i18n.translate('xpack.significantEventsApp.journeys.resumeEffect', {
    defaultMessage: 'New discovery runs can resume within the daily limit.',
  }),
  thresholdEffect: i18n.translate('xpack.significantEventsApp.journeys.thresholdEffect', {
    defaultMessage:
      'Future discovery findings below this confidence will be marked dismissed with the threshold recorded in their assessment.',
  }),
  developerMode: i18n.translate('xpack.significantEventsApp.journeys.developerMode', {
    defaultMessage: 'Developer mode',
  }),
  developerModeHint: i18n.translate('xpack.significantEventsApp.journeys.developerModeHint', {
    defaultMessage: 'Show technical lists and advanced engine controls.',
  }),
  relearn: i18n.translate('xpack.significantEventsApp.journeys.relearn', {
    defaultMessage: 'Refresh knowledge',
  }),
  learningPaused: i18n.translate('xpack.significantEventsApp.journeys.learningPaused', {
    defaultMessage: 'Learning paused',
  }),
  pauseLearning: i18n.translate('xpack.significantEventsApp.journeys.pauseLearning', {
    defaultMessage: 'Pause learning',
  }),
  resumeLearning: i18n.translate('xpack.significantEventsApp.journeys.resumeLearning', {
    defaultMessage: 'Resume learning',
  }),
  streamSearch: i18n.translate('xpack.significantEventsApp.journeys.streamSearch', {
    defaultMessage: 'Search streams',
  }),
  customStream: i18n.translate('xpack.significantEventsApp.journeys.customStream', {
    defaultMessage: 'Create ES|QL stream',
  }),
  streamName: i18n.translate('xpack.significantEventsApp.journeys.streamName', {
    defaultMessage: 'Stream name',
  }),
  streamQuery: i18n.translate('xpack.significantEventsApp.journeys.streamQuery', {
    defaultMessage: 'ES|QL query',
  }),
  createStream: i18n.translate('xpack.significantEventsApp.journeys.createStream', {
    defaultMessage: 'Create stream',
  }),
  addStreamHint: i18n.translate('xpack.significantEventsApp.journeys.addStreamHint', {
    defaultMessage:
      'Create a query stream to watch a focused slice of your data. Saving starts learning and discovery.',
  }),
  streamImpact: i18n.translate('xpack.significantEventsApp.journeys.streamImpact', {
    defaultMessage:
      'Applying watched patterns starts continuous learning and scheduled discovery for matching streams. Existing knowledge and events remain available.',
  }),
  watchedPatterns: i18n.translate('xpack.significantEventsApp.journeys.watchedPatterns', {
    defaultMessage: 'Watched index patterns',
  }),
  allLogs: i18n.translate('xpack.significantEventsApp.journeys.allLogs', {
    defaultMessage: 'All logs',
  }),
  allMetrics: i18n.translate('xpack.significantEventsApp.journeys.allMetrics', {
    defaultMessage: 'All metrics',
  }),
  configureHint: i18n.translate('xpack.significantEventsApp.journeys.configureHint', {
    defaultMessage:
      'Choose existing streams or create an ES|QL stream. Knowledge is retained when learning is paused.',
  }),
  watching: i18n.translate('xpack.significantEventsApp.journeys.watching', {
    defaultMessage: 'Watching',
  }),
  notWatching: i18n.translate('xpack.significantEventsApp.journeys.notWatching', {
    defaultMessage: 'Outside watched patterns',
  }),
  savePatterns: i18n.translate('xpack.significantEventsApp.journeys.savePatterns', {
    defaultMessage: 'Apply watched patterns',
  }),
  streamReady: i18n.translate('xpack.significantEventsApp.journeys.streamReady', {
    defaultMessage:
      'Streams configured. Learning and discovery are enabled; progress appears in Engine activity.',
  }),
  startDiscovery: i18n.translate('xpack.significantEventsApp.journeys.startDiscovery', {
    defaultMessage: 'Run discovery now',
  }),
  discoveryStarted: i18n.translate('xpack.significantEventsApp.journeys.discoveryStarted', {
    defaultMessage: 'Discovery started',
  }),
  retry: i18n.translate('xpack.significantEventsApp.journeys.retry', {
    defaultMessage: 'Try again',
  }),
  automationName: i18n.translate('xpack.significantEventsApp.journeys.automationName', {
    defaultMessage: 'Automation name',
  }),
  rulePattern: i18n.translate('xpack.significantEventsApp.journeys.rulePattern', {
    defaultMessage: 'Event title contains (optional)',
  }),
  automationPrompt: i18n.translate('xpack.significantEventsApp.journeys.automationPrompt', {
    defaultMessage: 'Investigation instructions',
  }),
  createAutomation: i18n.translate('xpack.significantEventsApp.journeys.createAutomation', {
    defaultMessage: 'Create automation',
  }),
  automationCreated: i18n.translate('xpack.significantEventsApp.journeys.automationCreated', {
    defaultMessage: 'Automation created',
  }),
  automationDisabled: i18n.translate('xpack.significantEventsApp.journeys.automationDisabled', {
    defaultMessage: 'Automations are unavailable in this deployment.',
  }),
  automationDefaultPrompt: i18n.translate(
    'xpack.significantEventsApp.journeys.automationDefaultPrompt',
    {
      defaultMessage:
        'Investigate this alert, explain the likely cause and impact, and include the evidence that supports the conclusion.',
    }
  ),
  automationDefaultName: i18n.translate(
    'xpack.significantEventsApp.journeys.automationDefaultName',
    { defaultMessage: 'Investigate significant events' }
  ),
  automationScopeHint: i18n.translate('xpack.significantEventsApp.journeys.automationScopeHint', {
    defaultMessage:
      'Investigates new or reopened significant events matching this title and severity. An empty title matches all event titles. Review the scope before enabling.',
  }),
  openWorkflow: i18n.translate('xpack.significantEventsApp.journeys.openWorkflow', {
    defaultMessage: 'Open workflow',
  }),
  automationEnabled: i18n.translate('xpack.significantEventsApp.journeys.automationEnabled', {
    defaultMessage: 'Enabled',
  }),
  automationNoItems: i18n.translate('xpack.significantEventsApp.journeys.automationNoItems', {
    defaultMessage: 'No investigation automations yet',
  }),
  create: i18n.translate('xpack.significantEventsApp.journeys.create', {
    defaultMessage: 'Create',
  }),
  error: i18n.translate('xpack.significantEventsApp.journeys.error', {
    defaultMessage: 'Could not complete the request',
  }),

  activity: i18n.translate('xpack.significantEventsApp.journeys.activity', {
    defaultMessage: 'Engine',
  }),
  knowledge: i18n.translate('xpack.significantEventsApp.journeys.knowledge', {
    defaultMessage: 'Knowledge',
  }),
  streams: i18n.translate('xpack.significantEventsApp.journeys.streams', {
    defaultMessage: 'Streams',
  }),
  learning: i18n.translate('xpack.significantEventsApp.journeys.learning', {
    defaultMessage: 'Learning your system',
  }),
  evaluating: i18n.translate('xpack.significantEventsApp.journeys.evaluating', {
    defaultMessage: 'Evaluating rules',
  }),
  discovery: i18n.translate('xpack.significantEventsApp.journeys.discovery', {
    defaultMessage: 'Explaining detections',
  }),
  review: i18n.translate('xpack.significantEventsApp.journeys.review', {
    defaultMessage: 'Reviewing events',
  }),
  running: i18n.translate('xpack.significantEventsApp.journeys.running', {
    defaultMessage: 'Running',
  }),
  idle: i18n.translate('xpack.significantEventsApp.journeys.idle', { defaultMessage: 'Idle' }),
  completed: i18n.translate('xpack.significantEventsApp.journeys.completed', {
    defaultMessage: 'Completed',
  }),
  failed: i18n.translate('xpack.significantEventsApp.journeys.failed', {
    defaultMessage: 'Needs attention',
  }),
  paused: i18n.translate('xpack.significantEventsApp.journeys.paused', {
    defaultMessage: 'Paused',
  }),
  off: i18n.translate('xpack.significantEventsApp.journeys.off', {
    defaultMessage: 'No watched streams',
  }),
  waiting: i18n.translate('xpack.significantEventsApp.journeys.waiting', {
    defaultMessage: 'Waiting for a run',
  }),
  learningHint: i18n.translate('xpack.significantEventsApp.journeys.learningHint', {
    defaultMessage: 'Extracting knowledge and generating rules from your streams.',
  }),
  evaluationHint: i18n.translate('xpack.significantEventsApp.journeys.evaluationHint', {
    defaultMessage: 'Checking rules against incoming telemetry.',
  }),
  discoveryHint: i18n.translate('xpack.significantEventsApp.journeys.discoveryHint', {
    defaultMessage: 'Correlating detections and explaining what matters.',
  }),
  reviewHint: i18n.translate('xpack.significantEventsApp.journeys.reviewHint', {
    defaultMessage: 'Following up on events as new evidence arrives.',
  }),
  lastRun: i18n.translate('xpack.significantEventsApp.journeys.lastRun', {
    defaultMessage: 'Last run',
  }),
  currentStep: i18n.translate('xpack.significantEventsApp.journeys.currentStep', {
    defaultMessage: 'Current step',
  }),
  recentRuns: i18n.translate('xpack.significantEventsApp.journeys.recentRuns', {
    defaultMessage: 'Recent runs',
  }),
  inProgress: i18n.translate('xpack.significantEventsApp.journeys.inProgress', {
    defaultMessage: 'In progress',
  }),
  noRuns: i18n.translate('xpack.significantEventsApp.journeys.noRuns', {
    defaultMessage: 'No runs recorded yet',
  }),
  noRunsHint: i18n.translate('xpack.significantEventsApp.journeys.noRunsHint', {
    defaultMessage: 'Once a watched stream is onboarded, its progress appears here.',
  }),
  configureStreams: i18n.translate('xpack.significantEventsApp.journeys.configureStreams', {
    defaultMessage: 'Configure streams',
  }),
  engineUnavailable: i18n.translate('xpack.significantEventsApp.journeys.engineUnavailable', {
    defaultMessage: 'Workflow progress is unavailable',
  }),
  showActivity: i18n.translate('xpack.significantEventsApp.journeys.showActivity', {
    defaultMessage: 'View activity',
  }),
  showKnowledge: i18n.translate('xpack.significantEventsApp.journeys.showKnowledge', {
    defaultMessage: 'Explore knowledge',
  }),
  steps: i18n.translate('xpack.significantEventsApp.journeys.steps', {
    defaultMessage: 'Recorded steps',
  }),
  noStepEstimate: i18n.translate('xpack.significantEventsApp.journeys.noStepEstimate', {
    defaultMessage:
      'Progress is reported as steps complete. A completion estimate is not available yet.',
  }),
  emptyKnowledge: i18n.translate('xpack.significantEventsApp.journeys.emptyKnowledge', {
    defaultMessage: 'Your knowledge is still taking shape',
  }),
  knowledgeHint: i18n.translate('xpack.significantEventsApp.journeys.knowledgeHint', {
    defaultMessage: 'Explore what Nightshift learned, where it came from, and what depends on it.',
  }),
  technologies: i18n.translate('xpack.significantEventsApp.journeys.technologies', {
    defaultMessage: 'Technologies',
  }),
  dependencies: i18n.translate('xpack.significantEventsApp.journeys.dependencies', {
    defaultMessage: 'Dependencies',
  }),
  patterns: i18n.translate('xpack.significantEventsApp.journeys.patterns', {
    defaultMessage: 'Patterns',
  }),
  infrastructure: i18n.translate('xpack.significantEventsApp.journeys.infrastructure', {
    defaultMessage: 'Infrastructure',
  }),
  services: i18n.translate('xpack.significantEventsApp.journeys.services', {
    defaultMessage: 'Services',
  }),
  allKnowledge: i18n.translate('xpack.significantEventsApp.journeys.allKnowledge', {
    defaultMessage: 'All knowledge',
  }),
  searchKnowledge: i18n.translate('xpack.significantEventsApp.journeys.searchKnowledge', {
    defaultMessage: 'Search knowledge, services and sources',
  }),
  excluded: i18n.translate('xpack.significantEventsApp.journeys.excluded', {
    defaultMessage: 'Excluded',
  }),
  showExcluded: i18n.translate('xpack.significantEventsApp.journeys.showExcluded', {
    defaultMessage: 'Include excluded knowledge',
  }),
  freshness: i18n.translate('xpack.significantEventsApp.journeys.freshness', {
    defaultMessage: 'Freshness',
  }),
  expires: i18n.translate('xpack.significantEventsApp.journeys.expires', {
    defaultMessage: 'Expires',
  }),
  noExpiry: i18n.translate('xpack.significantEventsApp.journeys.noExpiry', {
    defaultMessage: 'No expiry',
  }),
  relatedRules: i18n.translate('xpack.significantEventsApp.journeys.relatedRules', {
    defaultMessage: 'Rules using this knowledge',
  }),
  relatedKnowledge: i18n.translate('xpack.significantEventsApp.journeys.relatedKnowledge', {
    defaultMessage: 'Related knowledge',
  }),
  evidence: i18n.translate('xpack.significantEventsApp.journeys.evidence', {
    defaultMessage: 'Evidence',
  }),
  source: i18n.translate('xpack.significantEventsApp.journeys.source', {
    defaultMessage: 'Source',
  }),
  correct: i18n.translate('xpack.significantEventsApp.journeys.correct', {
    defaultMessage: 'Correct knowledge',
  }),
  save: i18n.translate('xpack.significantEventsApp.journeys.save', {
    defaultMessage: 'Save changes',
  }),
  cancel: i18n.translate('xpack.significantEventsApp.journeys.cancel', {
    defaultMessage: 'Cancel',
  }),
  title: i18n.translate('xpack.significantEventsApp.journeys.title', { defaultMessage: 'Title' }),
  description: i18n.translate('xpack.significantEventsApp.journeys.description', {
    defaultMessage: 'Description',
  }),
  correctionImpact: i18n.translate('xpack.significantEventsApp.journeys.correctionImpact', {
    defaultMessage:
      'Changes are saved to the knowledge used by detection. Existing events remain available.',
  }),
  openService: i18n.translate('xpack.significantEventsApp.journeys.openService', {
    defaultMessage: 'Explore service',
  }),
  reviewKnowledge: i18n.translate('xpack.significantEventsApp.journeys.reviewKnowledge', {
    defaultMessage: 'Review knowledge',
  }),
  noRelatedRules: i18n.translate('xpack.significantEventsApp.journeys.noRelatedRules', {
    defaultMessage: 'No rules currently reference this indicator.',
  }),
  browse: i18n.translate('xpack.significantEventsApp.journeys.browse', {
    defaultMessage: 'Browse',
  }),
  viewSource: i18n.translate('xpack.significantEventsApp.journeys.viewSource', {
    defaultMessage: 'View source',
  }),
  general: i18n.translate('xpack.significantEventsApp.journeys.general', {
    defaultMessage: 'General',
  }),
  investigations: i18n.translate('xpack.significantEventsApp.journeys.investigations', {
    defaultMessage: 'Investigations',
  }),
  detectionsSettings: i18n.translate('xpack.significantEventsApp.journeys.detectionsSettings', {
    defaultMessage: 'Detections',
  }),
  settingsIntro: i18n.translate('xpack.significantEventsApp.journeys.settingsIntro', {
    defaultMessage: 'Tune how Nightshift learns, detects, and investigates.',
  }),
  advanced: i18n.translate('xpack.significantEventsApp.journeys.advanced', {
    defaultMessage: 'Advanced controls',
  }),
  discoveryUsage: i18n.translate('xpack.significantEventsApp.journeys.discoveryUsage', {
    defaultMessage: 'Discovery usage',
  }),
  dailyLimit: i18n.translate('xpack.significantEventsApp.journeys.dailyLimit', {
    defaultMessage: 'Daily discovery limit',
  }),
  limitHint: i18n.translate('xpack.significantEventsApp.journeys.limitHint', {
    defaultMessage:
      'The limit applies to discovery runs. Existing rules and knowledge are retained.',
  }),
  usage: i18n.translate('xpack.significantEventsApp.journeys.usage', { defaultMessage: 'Usage' }),
  saveLimit: i18n.translate('xpack.significantEventsApp.journeys.saveLimit', {
    defaultMessage: 'Review limit change',
  }),
  confirmLimit: i18n.translate('xpack.significantEventsApp.journeys.confirmLimit', {
    defaultMessage: 'Apply daily limit',
  }),
  limitReached: i18n.translate('xpack.significantEventsApp.journeys.limitReached', {
    defaultMessage: 'Daily discovery limit reached',
  }),
  unlimited: i18n.translate('xpack.significantEventsApp.journeys.unlimited', {
    defaultMessage: 'Unlimited',
  }),
  usageUnit: i18n.translate('xpack.significantEventsApp.journeys.usageUnit', {
    defaultMessage: 'runs',
  }),
  cost: i18n.translate('xpack.significantEventsApp.journeys.cost', {
    defaultMessage: 'Estimated spend',
  }),
  automation: i18n.translate('xpack.significantEventsApp.journeys.automation', {
    defaultMessage: 'Investigation automations',
  }),
  automationHint: i18n.translate('xpack.significantEventsApp.journeys.automationHint', {
    defaultMessage:
      'Choose which significant events are investigated automatically. Notification delivery is configured in the backing workflow.',
  }),
  notification: i18n.translate('xpack.significantEventsApp.journeys.notification', {
    defaultMessage: 'Notifications',
  }),
  linkedServices: i18n.translate('xpack.significantEventsApp.journeys.linkedServices', {
    defaultMessage: 'Related services',
  }),
  openDiscover: i18n.translate('xpack.significantEventsApp.journeys.openDiscover', {
    defaultMessage: 'Open in Discover',
  }),
  openApm: i18n.translate('xpack.significantEventsApp.journeys.openApm', {
    defaultMessage: 'Open service in APM',
  }),
  openInfrastructure: i18n.translate('xpack.significantEventsApp.journeys.openInfrastructure', {
    defaultMessage: 'Open infrastructure',
  }),
  streamSettings: i18n.translate('xpack.significantEventsApp.journeys.streamSettings', {
    defaultMessage: 'Watched streams',
  }),
  lastActivity: i18n.translate('xpack.significantEventsApp.journeys.lastActivity', {
    defaultMessage: 'Last activity',
  }),
  noEstimate: i18n.translate('xpack.significantEventsApp.journeys.noEstimate', {
    defaultMessage: 'No estimate available',
  }),
  healthy: i18n.translate('xpack.significantEventsApp.journeys.healthy', {
    defaultMessage: 'Ready',
  }),
  triaging: i18n.translate('xpack.significantEventsApp.journeys.triaging', {
    defaultMessage: 'Awaiting triage',
  }),
  sourcePreserved: i18n.translate('xpack.significantEventsApp.journeys.sourcePreserved', {
    defaultMessage: 'Knowledge, rules and previous events are retained.',
  }),
  enginePaused: i18n.translate('xpack.significantEventsApp.journeys.enginePaused', {
    defaultMessage: 'New discovery is paused. Existing knowledge remains available.',
  }),
  settings: i18n.translate('xpack.significantEventsApp.journeys.settings', {
    defaultMessage: 'Settings',
  }),
};
