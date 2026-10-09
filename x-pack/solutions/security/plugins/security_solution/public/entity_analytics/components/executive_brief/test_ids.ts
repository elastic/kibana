/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TEST_IDS = {
  flyout: 'executiveBriefFlyout',
  progress: 'executiveBriefProgress',
  error: 'executiveBriefError',
  regenerate: 'executiveBriefRegenerate',
  generate: 'executiveBriefGenerate',
  startPanel: 'executiveBriefStartPanel',
  copyMarkdown: 'executiveBriefCopyMarkdown',
  exportPdf: 'executiveBriefExportPdf',
  basedOn: 'executiveBriefBasedOn',
  attentionVerdict: 'executiveBriefAttentionVerdict',
  attentionRow: (id: string) => `executiveBriefAttentionRow-${id}`,
  storylineCard: (id: string) => `executiveBriefStoryline-${id}`,
  stageTile: (tacticId: string) => `executiveBriefStage-${tacticId}`,
  decision: (index: number) => `executiveBriefDecision-${index}`,
  investigate: (index: number) => `executiveBriefInvestigate-${index}`,
  gapsTable: 'executiveBriefGapsTable',
  debugPanel: 'executiveBriefDebugPanel',
  empty: 'executiveBriefNoStorylines',
} as const;
