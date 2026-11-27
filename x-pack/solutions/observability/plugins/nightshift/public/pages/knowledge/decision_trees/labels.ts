/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  DecisionNodeType,
  LearningKind,
  SystemLearningCategory,
  ToolLearningCategory,
} from '@kbn/nightshift-decision-trees';
import type { DecisionTreeStatus } from './types';

const STATUS_LABELS: Record<DecisionTreeStatus, string> = {
  established: i18n.translate('xpack.nightshift.knowledge.decisionTrees.status.established', {
    defaultMessage: 'Established',
  }),
  tentative: i18n.translate('xpack.nightshift.knowledge.decisionTrees.status.tentative', {
    defaultMessage: 'Tentative',
  }),
  archived: i18n.translate('xpack.nightshift.knowledge.decisionTrees.status.archived', {
    defaultMessage: 'Archived',
  }),
};

export const getDecisionTreeStatusLabel = (status: DecisionTreeStatus): string =>
  STATUS_LABELS[status] ?? status;

const NODE_TYPE_LABELS: Record<DecisionNodeType, string> = {
  symptom: i18n.translate('xpack.nightshift.knowledge.decisionTrees.nodeType.symptom', {
    defaultMessage: 'Symptom',
  }),
  evidence_gatherer: i18n.translate(
    'xpack.nightshift.knowledge.decisionTrees.nodeType.evidenceGatherer',
    { defaultMessage: 'Evidence Gatherer' }
  ),
  decision: i18n.translate('xpack.nightshift.knowledge.decisionTrees.nodeType.decision', {
    defaultMessage: 'Decision',
  }),
  end: i18n.translate('xpack.nightshift.knowledge.decisionTrees.nodeType.end', {
    defaultMessage: 'End',
  }),
};

export const getDecisionNodeTypeLabel = (nodeType: DecisionNodeType): string =>
  NODE_TYPE_LABELS[nodeType] ?? nodeType;

const LEARNING_KIND_LABELS: Record<LearningKind, string> = {
  system: i18n.translate('xpack.nightshift.knowledge.decisionTrees.learningKind.system', {
    defaultMessage: 'System',
  }),
  tool: i18n.translate('xpack.nightshift.knowledge.decisionTrees.learningKind.tool', {
    defaultMessage: 'Tool',
  }),
  remediation: i18n.translate('xpack.nightshift.knowledge.decisionTrees.learningKind.remediation', {
    defaultMessage: 'Remediation',
  }),
};

export const getLearningKindLabel = (kind: LearningKind): string =>
  LEARNING_KIND_LABELS[kind] ?? kind;

const LEARNING_CATEGORY_LABELS: Record<SystemLearningCategory | ToolLearningCategory, string> = {
  architecture: i18n.translate(
    'xpack.nightshift.knowledge.decisionTrees.learningCategory.architecture',
    {
      defaultMessage: 'Architecture',
    }
  ),
  dependency: i18n.translate(
    'xpack.nightshift.knowledge.decisionTrees.learningCategory.dependency',
    {
      defaultMessage: 'Dependency',
    }
  ),
  relationship: i18n.translate(
    'xpack.nightshift.knowledge.decisionTrees.learningCategory.relationship',
    {
      defaultMessage: 'Relationship',
    }
  ),
  runtime_behavior: i18n.translate(
    'xpack.nightshift.knowledge.decisionTrees.learningCategory.runtimeBehavior',
    {
      defaultMessage: 'Runtime behavior',
    }
  ),
  data_flow: i18n.translate('xpack.nightshift.knowledge.decisionTrees.learningCategory.dataFlow', {
    defaultMessage: 'Data flow',
  }),
  ownership: i18n.translate('xpack.nightshift.knowledge.decisionTrees.learningCategory.ownership', {
    defaultMessage: 'Ownership',
  }),
  invariant: i18n.translate('xpack.nightshift.knowledge.decisionTrees.learningCategory.invariant', {
    defaultMessage: 'Invariant',
  }),
  error: i18n.translate('xpack.nightshift.knowledge.decisionTrees.learningCategory.error', {
    defaultMessage: 'Error',
  }),
  capability: i18n.translate(
    'xpack.nightshift.knowledge.decisionTrees.learningCategory.capability',
    {
      defaultMessage: 'Capability',
    }
  ),
  limitation: i18n.translate(
    'xpack.nightshift.knowledge.decisionTrees.learningCategory.limitation',
    {
      defaultMessage: 'Limitation',
    }
  ),
  usage_pattern: i18n.translate(
    'xpack.nightshift.knowledge.decisionTrees.learningCategory.usagePattern',
    {
      defaultMessage: 'Usage pattern',
    }
  ),
  tool_selection: i18n.translate(
    'xpack.nightshift.knowledge.decisionTrees.learningCategory.toolSelection',
    {
      defaultMessage: 'Tool selection',
    }
  ),
  query_pattern: i18n.translate(
    'xpack.nightshift.knowledge.decisionTrees.learningCategory.queryPattern',
    {
      defaultMessage: 'Query pattern',
    }
  ),
  docs_gap: i18n.translate('xpack.nightshift.knowledge.decisionTrees.learningCategory.docsGap', {
    defaultMessage: 'Docs gap',
  }),
};

export const getLearningCategoryLabel = (
  category: SystemLearningCategory | ToolLearningCategory
): string => LEARNING_CATEGORY_LABELS[category] ?? category;
