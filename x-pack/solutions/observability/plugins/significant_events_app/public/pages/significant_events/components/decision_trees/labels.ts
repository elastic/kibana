/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DecisionNodeType, LearningKind } from '@kbn/nightshift-decision-trees';
import type { DecisionTreeStatus } from './types';

const STATUS_LABELS: Record<DecisionTreeStatus, string> = {
  established: i18n.translate('xpack.significantEventsApp.decisionTrees.status.established', {
    defaultMessage: 'Established',
  }),
  tentative: i18n.translate('xpack.significantEventsApp.decisionTrees.status.tentative', {
    defaultMessage: 'Tentative',
  }),
  archived: i18n.translate('xpack.significantEventsApp.decisionTrees.status.archived', {
    defaultMessage: 'Archived',
  }),
};

export const getDecisionTreeStatusLabel = (status: DecisionTreeStatus): string =>
  STATUS_LABELS[status] ?? status;

const NODE_TYPE_LABELS: Record<DecisionNodeType, string> = {
  symptom: i18n.translate('xpack.significantEventsApp.decisionTrees.nodeType.symptom', {
    defaultMessage: 'Symptom',
  }),
  evidence_gatherer: i18n.translate(
    'xpack.significantEventsApp.decisionTrees.nodeType.evidenceGatherer',
    { defaultMessage: 'Evidence Gatherer' }
  ),
  decision: i18n.translate('xpack.significantEventsApp.decisionTrees.nodeType.decision', {
    defaultMessage: 'Decision',
  }),
  end: i18n.translate('xpack.significantEventsApp.decisionTrees.nodeType.end', {
    defaultMessage: 'End',
  }),
};

export const getDecisionNodeTypeLabel = (nodeType: DecisionNodeType): string =>
  NODE_TYPE_LABELS[nodeType] ?? nodeType;

const LEARNING_KIND_LABELS: Record<LearningKind, string> = {
  system: i18n.translate('xpack.significantEventsApp.decisionTrees.learningKind.system', {
    defaultMessage: 'System',
  }),
  tool: i18n.translate('xpack.significantEventsApp.decisionTrees.learningKind.tool', {
    defaultMessage: 'Tool',
  }),
  remediation: i18n.translate('xpack.significantEventsApp.decisionTrees.learningKind.remediation', {
    defaultMessage: 'Remediation',
  }),
};

export const getLearningKindLabel = (kind: LearningKind): string =>
  LEARNING_KIND_LABELS[kind] ?? kind;
