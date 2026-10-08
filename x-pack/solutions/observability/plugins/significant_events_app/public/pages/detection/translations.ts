/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const labels = {
  eventType: i18n.translate('xpack.significantEventsApp.detection.eventType', {
    defaultMessage: 'Event type',
  }),
  allActivity: i18n.translate('xpack.significantEventsApp.detection.allActivity', {
    defaultMessage: 'All',
  }),
  eventStatus: i18n.translate('xpack.significantEventsApp.detection.eventStatus', {
    defaultMessage: 'Status',
  }),
  allStatuses: i18n.translate('xpack.significantEventsApp.detection.allStatuses', {
    defaultMessage: 'All statuses',
  }),
  pendingDetection: i18n.translate('xpack.significantEventsApp.detection.pendingDetection', {
    defaultMessage: 'Pending',
  }),
  processedDetection: i18n.translate('xpack.significantEventsApp.detection.processedDetection', {
    defaultMessage: 'Processed',
  }),
  searchEvents: i18n.translate('xpack.significantEventsApp.detection.searchEvents', {
    defaultMessage: 'Search events and detections',
  }),
  noMatchingEvents: i18n.translate('xpack.significantEventsApp.detection.noMatchingEvents', {
    defaultMessage: 'No detections or significant events match this view',
  }),
  significantEvent: i18n.translate('xpack.significantEventsApp.detection.significantEvent', {
    defaultMessage: 'Significant event',
  }),
  ruleFired: i18n.translate('xpack.significantEventsApp.detection.ruleFired', {
    defaultMessage: 'Rule fired · Detection',
  }),
  detectionEvidence: i18n.translate('xpack.significantEventsApp.detection.detectionEvidence', {
    defaultMessage: 'Inspect detection',
  }),
  showMore: i18n.translate('xpack.significantEventsApp.detection.showMore', {
    defaultMessage: 'Show more',
  }),
  knowledgeAdded: i18n.translate('xpack.significantEventsApp.detection.knowledgeAdded', {
    defaultMessage: 'New KI recorded',
  }),
  knowledgeRemoved: i18n.translate('xpack.significantEventsApp.detection.knowledgeRemoved', {
    defaultMessage: 'KI removed',
  }),
  ruleAdded: i18n.translate('xpack.significantEventsApp.detection.ruleAdded', {
    defaultMessage: 'Rule recorded',
  }),
  ruleUpdated: i18n.translate('xpack.significantEventsApp.detection.ruleUpdated', {
    defaultMessage: 'Rule updated',
  }),
  ruleRemoved: i18n.translate('xpack.significantEventsApp.detection.ruleRemoved', {
    defaultMessage: 'Rule retired',
  }),
  ruleActivity: i18n.translate('xpack.significantEventsApp.detection.ruleActivity', {
    defaultMessage: 'Rule changes',
  }),
  timelineHistory: i18n.translate('xpack.significantEventsApp.detection.timelineHistory', {
    defaultMessage:
      'History from retained KI revisions and recorded detections/events. First-recorded markers reflect available history; matches are optional.',
  }),

  knowledgeUpdated: i18n.translate('xpack.significantEventsApp.detection.knowledgeUpdated', {
    defaultMessage: 'Knowledge updated',
  }),
  fitActivity: i18n.translate('xpack.significantEventsApp.detection.fitActivity', {
    defaultMessage: 'Fit activity',
  }),
  fullRange: i18n.translate('xpack.significantEventsApp.detection.fullRange', {
    defaultMessage: 'Full time range',
  }),
  timelineView: i18n.translate('xpack.significantEventsApp.detection.timelineView', {
    defaultMessage: 'Timeline view',
  }),
  serviceLanes: i18n.translate('xpack.significantEventsApp.detection.serviceLanes', {
    defaultMessage: 'Service lanes',
  }),
  activityFeed: i18n.translate('xpack.significantEventsApp.detection.activityFeed', {
    defaultMessage: 'Activity feed',
  }),
  closeDetails: i18n.translate('xpack.significantEventsApp.detection.closeDetails', {
    defaultMessage: 'Close',
  }),
  timelineFootnote: i18n.translate('xpack.significantEventsApp.detection.timelineFootnote', {
    defaultMessage:
      'Expand a service to compare its rules. Select a marker for evidence. Knowledge markers show the latest recorded update.',
  }),
  noTimelineActivity: i18n.translate('xpack.significantEventsApp.detection.noTimelineActivity', {
    defaultMessage: 'No recorded activity in this range. Try a wider range.',
  }),

  overview: i18n.translate('xpack.significantEventsApp.detection.overview', {
    defaultMessage: 'Overview',
  }),
  title: i18n.translate('xpack.significantEventsApp.detection.title', {
    defaultMessage: 'Detection',
  }),
  nightshift: i18n.translate('xpack.significantEventsApp.detection.nightshift', {
    defaultMessage: 'Nightshift',
  }),
  management: i18n.translate('xpack.significantEventsApp.detection.management', {
    defaultMessage: 'Management',
  }),
  settings: i18n.translate('xpack.significantEventsApp.detection.settings', {
    defaultMessage: 'Settings',
  }),
  eyebrow: i18n.translate('xpack.significantEventsApp.detection.eyebrow', {
    defaultMessage: 'DETECTION ENGINE',
  }),
  headline: i18n.translate('xpack.significantEventsApp.detection.headline', {
    defaultMessage: 'See the signal. Understand the system.',
  }),
  description: i18n.translate('xpack.significantEventsApp.detection.description', {
    defaultMessage:
      'Explore what Nightshift knows, what it watches, and the evidence behind every finding.',
  }),
  enabled: i18n.translate('xpack.significantEventsApp.detection.enabled', {
    defaultMessage: 'Activity enabled',
  }),
  paused: i18n.translate('xpack.significantEventsApp.detection.paused', {
    defaultMessage: 'Activity paused',
  }),
  statusUnknown: i18n.translate('xpack.significantEventsApp.detection.statusUnknown', {
    defaultMessage: 'Activity status unavailable',
  }),
  live: i18n.translate('xpack.significantEventsApp.detection.live', {
    defaultMessage: 'Live data',
  }),
  refresh: i18n.translate('xpack.significantEventsApp.detection.refresh', {
    defaultMessage: 'Refresh data',
  }),
  updated: i18n.translate('xpack.significantEventsApp.detection.updated', {
    defaultMessage: 'Last refreshed',
  }),
  entities: i18n.translate('xpack.significantEventsApp.detection.entities', {
    defaultMessage: 'Entities learned',
  }),
  knowledge: i18n.translate('xpack.significantEventsApp.detection.knowledge', {
    defaultMessage: 'Knowledge records',
  }),
  rules: i18n.translate('xpack.significantEventsApp.detection.rules', {
    defaultMessage: 'Active rules',
  }),
  detections: i18n.translate('xpack.significantEventsApp.detection.detections', {
    defaultMessage: 'Detections',
  }),
  events: i18n.translate('xpack.significantEventsApp.detection.events', {
    defaultMessage: 'Significant events',
  }),
  entitiesHint: i18n.translate('xpack.significantEventsApp.detection.entitiesHint', {
    defaultMessage: 'Services, databases and queues',
  }),
  knowledgeHint: i18n.translate('xpack.significantEventsApp.detection.knowledgeHint', {
    defaultMessage: 'Current, non-excluded knowledge',
  }),
  rulesHint: i18n.translate('xpack.significantEventsApp.detection.rulesHint', {
    defaultMessage: 'Rules with an alerting rule attached',
  }),
  detectionsHint: i18n.translate('xpack.significantEventsApp.detection.detectionsHint', {
    defaultMessage: 'Change-point observations in this range',
  }),
  eventsHint: i18n.translate('xpack.significantEventsApp.detection.eventsHint', {
    defaultMessage: 'Published events in this range',
  }),
  services: i18n.translate('xpack.significantEventsApp.detection.services', {
    defaultMessage: 'Your services',
  }),
  search: i18n.translate('xpack.significantEventsApp.detection.search', {
    defaultMessage: 'Find a service…',
  }),
  allServices: i18n.translate('xpack.significantEventsApp.detection.allServices', {
    defaultMessage: 'All services',
  }),
  showAll: i18n.translate('xpack.significantEventsApp.detection.showAll', {
    defaultMessage: 'Show entire system',
  }),
  topology: i18n.translate('xpack.significantEventsApp.detection.topology', {
    defaultMessage: 'Your system, connected',
  }),
  unknownNamespace: i18n.translate('xpack.significantEventsApp.detection.unknownNamespace', {
    defaultMessage: 'No namespace',
  }),
  topologyDescription: i18n.translate('xpack.significantEventsApp.detection.topologyDescription', {
    defaultMessage:
      'Services are grouped into namespace islands. Select a service to explore, or select an island heading to focus.',
  }),
  dependency: i18n.translate('xpack.significantEventsApp.detection.dependency', {
    defaultMessage: 'Learned dependency',
  }),
  selected: i18n.translate('xpack.significantEventsApp.detection.selected', {
    defaultMessage: 'Selected service',
  }),
  withEvents: i18n.translate('xpack.significantEventsApp.detection.withEvents', {
    defaultMessage: 'Has open events',
  }),
  coverageGap: i18n.translate('xpack.significantEventsApp.detection.coverageGap', {
    defaultMessage: 'No active rules',
  }),
  noRelationships: i18n.translate('xpack.significantEventsApp.detection.noRelationships', {
    defaultMessage: 'No learned relationships',
  }),
  graphLabel: i18n.translate('xpack.significantEventsApp.detection.graphLabel', {
    defaultMessage:
      'Service dependency map. Select a node to inspect its knowledge, rules and signals.',
  }),
  graphHint: i18n.translate('xpack.significantEventsApp.detection.graphHint', {
    defaultMessage:
      'Drag to pan. Scroll to zoom. Select a service or dependency to inspect its evidence.',
  }),
  focus: i18n.translate('xpack.significantEventsApp.detection.focus', {
    defaultMessage: 'Focus connections',
  }),
  reset: i18n.translate('xpack.significantEventsApp.detection.reset', {
    defaultMessage: 'Show all connections',
  }),
  zoomIn: i18n.translate('xpack.significantEventsApp.detection.zoomIn', {
    defaultMessage: 'Zoom in',
  }),
  zoomOut: i18n.translate('xpack.significantEventsApp.detection.zoomOut', {
    defaultMessage: 'Zoom out',
  }),
  fit: i18n.translate('xpack.significantEventsApp.detection.fit', { defaultMessage: 'Fit map' }),
  inspect: i18n.translate('xpack.significantEventsApp.detection.inspect', {
    defaultMessage: 'Service overview',
  }),
  selectEntity: i18n.translate('xpack.significantEventsApp.detection.selectEntity', {
    defaultMessage: 'Select a service to see its knowledge, coverage and recent activity.',
  }),
  coverage: i18n.translate('xpack.significantEventsApp.detection.coverage', {
    defaultMessage: 'Detection coverage',
  }),
  covered: i18n.translate('xpack.significantEventsApp.detection.covered', {
    defaultMessage: 'Active rules in this source',
  }),
  uncovered: i18n.translate('xpack.significantEventsApp.detection.uncovered', {
    defaultMessage: 'No active rules in this source',
  }),
  rulesSourceHint: i18n.translate('xpack.significantEventsApp.detection.rulesSourceHint', {
    defaultMessage:
      'Rules below watch the associated source; coverage of individual operations is not established.',
  }),
  source: i18n.translate('xpack.significantEventsApp.detection.source', {
    defaultMessage: 'Source',
  }),
  sources: i18n.translate('xpack.significantEventsApp.detection.sources', {
    defaultMessage: 'Sources',
  }),
  dependencies: i18n.translate('xpack.significantEventsApp.detection.dependencies', {
    defaultMessage: 'Dependencies',
  }),
  upstream: i18n.translate('xpack.significantEventsApp.detection.upstream', {
    defaultMessage: 'Used by',
  }),
  downstream: i18n.translate('xpack.significantEventsApp.detection.downstream', {
    defaultMessage: 'Depends on',
  }),
  noDependencies: i18n.translate('xpack.significantEventsApp.detection.noDependencies', {
    defaultMessage: 'No relationships learned yet',
  }),
  learned: i18n.translate('xpack.significantEventsApp.detection.learned', {
    defaultMessage: 'What it knows',
  }),
  infrastructure: i18n.translate('xpack.significantEventsApp.detection.infrastructure', {
    defaultMessage: 'Infrastructure',
  }),
  evidence: i18n.translate('xpack.significantEventsApp.detection.evidence', {
    defaultMessage: 'Evidence',
  }),
  noKnowledge: i18n.translate('xpack.significantEventsApp.detection.noKnowledge', {
    defaultMessage: 'No knowledge records yet',
  }),
  viewKnowledge: i18n.translate('xpack.significantEventsApp.detection.viewKnowledge', {
    defaultMessage: 'Inspect knowledge',
  }),
  viewRules: i18n.translate('xpack.significantEventsApp.detection.viewRules', {
    defaultMessage: 'Inspect rules',
  }),
  freshness: i18n.translate('xpack.significantEventsApp.detection.freshness', {
    defaultMessage: 'Knowledge last updated',
  }),
  timeline: i18n.translate('xpack.significantEventsApp.detection.timeline', {
    defaultMessage: 'The shape of your signals',
  }),
  timelineDescription: i18n.translate('xpack.significantEventsApp.detection.timelineDescription', {
    defaultMessage:
      'Rule matches over time, with detections and significant events on the same axis.',
  }),
  matches: i18n.translate('xpack.significantEventsApp.detection.matches', {
    defaultMessage: 'Rule matches',
  }),
  occurrencesHint: i18n.translate('xpack.significantEventsApp.detection.occurrencesHint', {
    defaultMessage:
      'Matches are observations, not incidents. Several rules may match the same log.',
  }),
  noRules: i18n.translate('xpack.significantEventsApp.detection.noRules', {
    defaultMessage: 'No rules generated yet',
  }),
  noRulesBody: i18n.translate('xpack.significantEventsApp.detection.noRulesBody', {
    defaultMessage: 'No rules are available for this selection yet.',
  }),
  noMatches: i18n.translate('xpack.significantEventsApp.detection.noMatches', {
    defaultMessage: 'No rule matches in this time range',
  }),
  noMatchesBody: i18n.translate('xpack.significantEventsApp.detection.noMatchesBody', {
    defaultMessage:
      'This does not establish that a service is healthy. Try a wider time range or inspect its coverage.',
  }),
  watching: i18n.translate('xpack.significantEventsApp.detection.watching', {
    defaultMessage: 'What is being watched',
  }),
  watchingDescription: i18n.translate('xpack.significantEventsApp.detection.watchingDescription', {
    defaultMessage: 'The rules behind this view, with their observed activity.',
  }),
  active: i18n.translate('xpack.significantEventsApp.detection.active', {
    defaultMessage: 'Active',
  }),
  draft: i18n.translate('xpack.significantEventsApp.detection.draft', { defaultMessage: 'Draft' }),
  ruleMatches: i18n.translate('xpack.significantEventsApp.detection.ruleMatches', {
    defaultMessage: 'Matches in range',
  }),
  openRule: i18n.translate('xpack.significantEventsApp.detection.openRule', {
    defaultMessage: 'Open rule details',
  }),
  findings: i18n.translate('xpack.significantEventsApp.detection.findings', {
    defaultMessage: 'What needs a closer look',
  }),
  findingsDescription: i18n.translate('xpack.significantEventsApp.detection.findingsDescription', {
    defaultMessage: 'Significant events, their reasoning, and the path to their evidence.',
  }),
  noEvents: i18n.translate('xpack.significantEventsApp.detection.noEvents', {
    defaultMessage: 'No significant events in this range',
  }),
  noEventsBody: i18n.translate('xpack.significantEventsApp.detection.noEventsBody', {
    defaultMessage: 'Published findings will appear here with their evidence.',
  }),
  openEvent: i18n.translate('xpack.significantEventsApp.detection.openEvent', {
    defaultMessage: 'Explain event',
  }),
  openDetections: i18n.translate('xpack.significantEventsApp.detection.openDetections', {
    defaultMessage: 'Inspect detections',
  }),
  scope: i18n.translate('xpack.significantEventsApp.detection.scope', { defaultMessage: 'View' }),
  system: i18n.translate('xpack.significantEventsApp.detection.system', {
    defaultMessage: 'Entire system',
  }),
  serviceScope: i18n.translate('xpack.significantEventsApp.detection.serviceScope', {
    defaultMessage: 'Selected service',
  }),
  loadError: i18n.translate('xpack.significantEventsApp.detection.loadError', {
    defaultMessage: 'Could not load detection data',
  }),
  retry: i18n.translate('xpack.significantEventsApp.detection.retry', {
    defaultMessage: 'Try again',
  }),
  loading: i18n.translate('xpack.significantEventsApp.detection.loading', {
    defaultMessage: 'Loading your system…',
  }),
  emptyTitle: i18n.translate('xpack.significantEventsApp.detection.emptyTitle', {
    defaultMessage: 'Your system starts with a source',
  }),
  emptyBody: i18n.translate('xpack.significantEventsApp.detection.emptyBody', {
    defaultMessage:
      'Choose watched sources in Detection so Nightshift can learn your services and dependencies. This map fills in from real knowledge as it becomes available.',
  }),
  partial: i18n.translate('xpack.significantEventsApp.detection.partial', {
    defaultMessage:
      'Some results exceed the 1,000-record limit. Narrow the time range to see more activity.',
  }),
  unresolved: i18n.translate('xpack.significantEventsApp.detection.unresolved', {
    defaultMessage:
      'Some learned dependencies have unresolved endpoints. They are not drawn on this map.',
  }),
  unassigned: i18n.translate('xpack.significantEventsApp.detection.unassigned', {
    defaultMessage:
      'Some rules could not be associated with an entity. The active-rule total includes them; inspect the complete list in Management.',
  }),
  emptyServices: i18n.translate('xpack.significantEventsApp.detection.emptyServices', {
    defaultMessage: 'No services match your search',
  }),
  noData: i18n.translate('xpack.significantEventsApp.detection.noData', {
    defaultMessage: 'Not available',
  }),
  currentKnowledge: i18n.translate('xpack.significantEventsApp.detection.currentKnowledge', {
    defaultMessage: 'Current knowledge · Activity in the selected time range.',
  }),
  browseRules: i18n.translate('xpack.significantEventsApp.detection.browseRules', {
    defaultMessage: 'Rules',
  }),
  browseTimeline: i18n.translate('xpack.significantEventsApp.detection.browseTimeline', {
    defaultMessage: 'Timeline',
  }),
  browseEvents: i18n.translate('xpack.significantEventsApp.detection.browseEvents', {
    defaultMessage: 'Events',
  }),
  allRules: i18n.translate('xpack.significantEventsApp.detection.allRules', {
    defaultMessage: 'All rules',
  }),
  open: i18n.translate('xpack.significantEventsApp.detection.open', { defaultMessage: 'Open' }),
  closed: i18n.translate('xpack.significantEventsApp.detection.closed', {
    defaultMessage: 'Closed',
  }),
  dismissed: i18n.translate('xpack.significantEventsApp.detection.dismissed', {
    defaultMessage: 'Dismissed',
  }),
  nodeRules: i18n.translate('xpack.significantEventsApp.detection.nodeRules', {
    defaultMessage: 'rules',
  }),
  nodeEvents: i18n.translate('xpack.significantEventsApp.detection.nodeEvents', {
    defaultMessage: 'events',
  }),
  stale: i18n.translate('xpack.significantEventsApp.detection.stale', {
    defaultMessage: 'Expired knowledge',
  }),
  first: i18n.translate('xpack.significantEventsApp.detection.first', {
    defaultMessage: 'Entry points',
  }),
  middle: i18n.translate('xpack.significantEventsApp.detection.middle', {
    defaultMessage: 'Services',
  }),
  last: i18n.translate('xpack.significantEventsApp.detection.last', {
    defaultMessage: 'Dependencies',
  }),
  otherEntities: i18n.translate('xpack.significantEventsApp.detection.otherEntities', {
    defaultMessage: 'Other learned entities',
  }),
  isUpdating: i18n.translate('xpack.significantEventsApp.detection.isUpdating', {
    defaultMessage: 'Updating data…',
  }),
  samples: i18n.translate('xpack.significantEventsApp.detection.samples', {
    defaultMessage: 'Sample evidence',
  }),
  confidence: i18n.translate('xpack.significantEventsApp.detection.confidence', {
    defaultMessage: 'Knowledge confidence',
  }),
  eventConfidence: i18n.translate('xpack.significantEventsApp.detection.eventConfidence', {
    defaultMessage: 'Event confidence',
  }),
  signals: i18n.translate('xpack.significantEventsApp.detection.signals', {
    defaultMessage: 'Signals',
  }),
  noEvidence: i18n.translate('xpack.significantEventsApp.detection.noEvidence', {
    defaultMessage: 'No sample evidence recorded',
  }),
  timelineLabel: i18n.translate('xpack.significantEventsApp.detection.timelineLabel', {
    defaultMessage: 'Rule activity over the selected time range',
  }),
};
