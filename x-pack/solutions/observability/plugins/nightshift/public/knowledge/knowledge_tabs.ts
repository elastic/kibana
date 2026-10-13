/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FeatureAvailability } from './feature_availability';

export const KNOWLEDGE_TAB_IDS = ['cortex', 'memory', 'decision_trees'] as const;

export type KnowledgeTabId = (typeof KNOWLEDGE_TAB_IDS)[number];
export type KnowledgeTabsAvailability = Record<KnowledgeTabId, FeatureAvailability>;

export const KNOWLEDGE_TAB_LABELS: Record<KnowledgeTabId, string> = {
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

export const isAnyKnowledgeTabLoading = (availability: KnowledgeTabsAvailability): boolean =>
  KNOWLEDGE_TAB_IDS.some((id) => availability[id].isLoading);

// TODO(#1792): remove once the Knowledge Indicators tab lands; it is always available.
export const isKnowledgeMenuItemVisible = (availability: KnowledgeTabsAvailability): boolean =>
  !isAnyKnowledgeTabLoading(availability) && getVisibleKnowledgeTabs(availability).length > 0;
