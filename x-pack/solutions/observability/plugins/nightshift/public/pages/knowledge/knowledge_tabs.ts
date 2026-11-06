/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FeatureAvailability } from './feature_availability';

export const KNOWLEDGE_TAB_IDS = [
  'knowledge_indicators',
  'cortex',
  'memory',
  'decision_trees',
] as const;

export type KnowledgeTabId = (typeof KNOWLEDGE_TAB_IDS)[number];
export type KnowledgeTabsAvailability = Record<KnowledgeTabId, FeatureAvailability>;

export const KNOWLEDGE_TAB_LABELS: Record<KnowledgeTabId, string> = {
  knowledge_indicators: i18n.translate('xpack.nightshift.knowledgePage.tabs.knowledgeIndicators', {
    defaultMessage: 'Knowledge Indicators',
  }),
  cortex: i18n.translate('xpack.nightshift.knowledgePage.tabs.cortex', {
    defaultMessage: 'Cortex',
  }),
  memory: i18n.translate('xpack.nightshift.knowledgePage.tabs.memory', {
    defaultMessage: 'Memory',
  }),
  decision_trees: i18n.translate('xpack.nightshift.knowledgePage.tabs.decisionTrees', {
    defaultMessage: 'Decision Trees',
  }),
};

export const isKnowledgeTabId = (value: string): value is KnowledgeTabId =>
  KNOWLEDGE_TAB_IDS.includes(value as KnowledgeTabId);

export const getVisibleKnowledgeTabs = (
  availability: KnowledgeTabsAvailability
): KnowledgeTabId[] => KNOWLEDGE_TAB_IDS.filter((id) => availability[id].isEnabled);

/** Waits on a loading tab only if no earlier tab is enabled. */
export const getDefaultKnowledgeTab = (
  availability: KnowledgeTabsAvailability
): KnowledgeTabId | 'loading' | undefined => {
  for (const id of KNOWLEDGE_TAB_IDS) {
    if (availability[id].isEnabled) return id;
    if (availability[id].isLoading) return 'loading';
  }
  return undefined;
};
