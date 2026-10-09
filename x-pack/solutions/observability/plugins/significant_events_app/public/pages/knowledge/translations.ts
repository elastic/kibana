/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const knowledgeLabels = {
  speedFastest: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.speedFastest', {
    defaultMessage: '10× · Fastest',
  }),
  speedFaster: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.speedFaster', {
    defaultMessage: '5× · Faster',
  }),
  speedFast: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.speedFast', {
    defaultMessage: '2× · Fast',
  }),
  speedNatural: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.speedNatural', {
    defaultMessage: '1× · Natural',
  }),
  speedSlow: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.speedSlow', {
    defaultMessage: '0.5× · Slow',
  }),
  simulationSpeedHint: i18n.translate(
    'xpack.significantEventsApp.knowledgeExplorer.simulationSpeedHint',
    {
      defaultMessage:
        'Change the arrival speed at any time without restarting the learning preview.',
    }
  ),
  simulationSpeed: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.simulationSpeed', {
    defaultMessage: 'Simulation speed',
  }),
  inspectSourceRecord: i18n.translate(
    'xpack.significantEventsApp.knowledgeExplorer.inspectSourceRecord',
    { defaultMessage: 'Inspect a source record…' }
  ),
  groupedRecords: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.groupedRecords', {
    defaultMessage: 'Grouped KI records',
  }),
  nodes: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.nodes', {
    defaultMessage: 'Nodes',
  }),
  sizeHint: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.sizeHint', {
    defaultMessage: 'More connections · larger stars',
  }),
  focusService: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.focusService', {
    defaultMessage: 'Focus this service',
  }),
  connections: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.connections', {
    defaultMessage: 'Connections',
  }),
  previewHint: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.previewHint', {
    defaultMessage:
      'Preview only: replay existing KIs arriving one at a time at an uneven pace. Your stored knowledge and catalog stay unchanged.',
  }),
  preview: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.preview', {
    defaultMessage: 'Learning preview',
  }),
  stopSimulation: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.stopSimulation', {
    defaultMessage: 'Stop simulation',
  }),
  simulate: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.simulate', {
    defaultMessage: 'Simulate learning',
  }),
  sources: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.sources', {
    defaultMessage: 'Sources',
  }),
  servicePane: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.servicePane', {
    defaultMessage: 'Your services',
  }),
  multiSelectHint: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.multiSelectHint', {
    defaultMessage: 'Select one or more services',
  }),
  matchingCount: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.matchingCount', {
    defaultMessage: 'Knowledge matching the current filters',
  }),
  title: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.title', {
    defaultMessage: 'Knowledge, connected',
  }),
  subtitle: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.subtitle', {
    defaultMessage: 'Explore what your system knows, where it came from, and the rules it powers.',
  }),
  graph: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.graph', {
    defaultMessage: 'Show graph',
  }),
  graphTitle: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.graphTitle', {
    defaultMessage: 'Your knowledge galaxy',
  }),
  graphHint: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.graphHint', {
    defaultMessage:
      'Click a KI to inspect. Drag a node to reshape; drag the background to pan; scroll to zoom. Dotted links share a source. Glowing service connections represent learned dependencies; click a connection to inspect its KI.',
  }),
  graphAccessible: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.graphAccessible', {
    defaultMessage:
      'Interactive KI galaxy. Tab through knowledge indicators and press Enter to inspect. Use arrow keys to pan and plus or minus to zoom.',
  }),
  learning: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.learning', {
    defaultMessage: 'Learning from your sources',
  }),
  live: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.live', {
    defaultMessage: 'Live knowledge',
  }),
  services: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.services', {
    defaultMessage: 'Find and select services…',
  }),
  deployments: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.deployments', {
    defaultMessage: 'All deployments',
  }),
  allQueries: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.allQueries', {
    defaultMessage: 'Any query usage',
  }),
  missingQueries: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.missingQueries', {
    defaultMessage: 'Missing queries',
  }),
  withQueries: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.withQueries', {
    defaultMessage: 'Used by queries',
  }),
  missingHint: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.missingHint', {
    defaultMessage: 'Knowledge with no query referencing its ID in the same source.',
  }),
  anyConfidence: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.anyConfidence', {
    defaultMessage: 'Any confidence',
  }),
  highConfidence: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.highConfidence', {
    defaultMessage: 'High confidence · 80%+',
  }),
  reviewConfidence: i18n.translate(
    'xpack.significantEventsApp.knowledgeExplorer.reviewConfidence',
    { defaultMessage: 'Needs review · below 80%' }
  ),
  anyAge: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.anyAge', {
    defaultMessage: 'Any update time',
  }),
  recent: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.recent', {
    defaultMessage: 'Updated in the last 24 hours',
  }),
  reset: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.reset', {
    defaultMessage: 'Reset filters',
  }),
  sourceMembership: i18n.translate(
    'xpack.significantEventsApp.knowledgeExplorer.sourceMembership',
    { defaultMessage: 'Source knowledge' }
  ),
  queryLinks: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.queryLinks', {
    defaultMessage: 'Query references',
  }),
  earlierSnapshot: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.earlierSnapshot', {
    defaultMessage: 'Dashed query links reference an earlier extraction snapshot.',
  }),
  queries: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.queries', {
    defaultMessage: 'Linked queries',
  }),
  knowledge: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.knowledge', {
    defaultMessage: 'Knowledge indicators',
  }),
  matches: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.matches', {
    defaultMessage: 'Matching knowledge',
  }),
  inspect: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.inspect', {
    defaultMessage: 'Inspect knowledge',
  }),
  zoomIn: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.zoomIn', {
    defaultMessage: 'Zoom in',
  }),
  zoomOut: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.zoomOut', {
    defaultMessage: 'Zoom out',
  }),
  fit: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.fit', {
    defaultMessage: 'Fit knowledge graph',
  }),
  blankTitle: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.blankTitle', {
    defaultMessage: 'No knowledge matches this view',
  }),
  blankBody: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.blankBody', {
    defaultMessage:
      'Try another service, category, or query filter. The graph and catalog use the same selection.',
  }),
  refreshed: i18n.translate('xpack.significantEventsApp.knowledgeExplorer.refreshed', {
    defaultMessage: 'Refresh knowledge',
  }),
};
