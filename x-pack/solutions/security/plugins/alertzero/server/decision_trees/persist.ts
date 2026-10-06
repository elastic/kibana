/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DecisionTreeValidationError,
  enforceMinimumGraph,
  enforceNodePreservation,
  enforceParsedSizeFloor,
  enforceRawSizeFloor,
  extractMermaid,
  parseMermaidDecisionTree,
  symptomTreeId,
  validateEvidenceMetadata,
} from '@kbn/nightshift-decision-trees';
import {
  SECURITY_DECISION_TREE_STATUS_TENTATIVE,
  SECURITY_DECISION_TREE_TAG,
  SECURITY_DECISION_TREE_TYPE,
} from './constants';

/** Matches the Context Engine KI content cap. A longer diagram is not written. */
const MAX_MERMAID_CHARS = 65_536;
const MAX_DESCRIPTION_CHARS = 2_048;
const MAX_TITLE_CHARS = 512;
const MAX_EVIDENCE_ENTRIES = 100;
const MAX_EVIDENCE_ENTRY_CHARS = 10_000;
const MAX_KEYWORDS = 20;
const MAX_KEYWORD_CHARS = 256;

export interface PersistDecisionTreeInput {
  symptom: string;
  kiId: string;
  priorMermaid?: string;
  priorVersion?: number;
  mermaid: string;
  applicability?: string;
  evidenceGathererMetadata?: string[];
  keywords?: string[];
}

export interface PersistDecisionTreeResult {
  skipped: boolean;
  reason: string;
  kiId: string;
  type: typeof SECURITY_DECISION_TREE_TYPE;
  title: string;
  description: string;
  content: string;
  tag: typeof SECURITY_DECISION_TREE_TAG;
  status: typeof SECURITY_DECISION_TREE_STATUS_TENTATIVE;
  version: number;
  symptom: string;
  evidenceGathererMetadata: string[];
  keywords: string[];
}

const emptyResult = (reason: string, symptom = '', kiId = ''): PersistDecisionTreeResult => ({
  skipped: true,
  reason,
  kiId,
  type: SECURITY_DECISION_TREE_TYPE,
  title: '',
  description: '',
  content: '',
  tag: SECURITY_DECISION_TREE_TAG,
  status: SECURITY_DECISION_TREE_STATUS_TENTATIVE,
  version: 0,
  symptom,
  evidenceGathererMetadata: [],
  keywords: [],
});

const titleFromSymptom = (symptom: string): string =>
  symptom
    .split('-')
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .slice(0, MAX_TITLE_CHARS);

const boundedList = (values: string[] | undefined, maxItems: number, maxChars: number): string[] =>
  (values ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice(0, maxItems)
    .map((value) => value.slice(0, maxChars));

/**
 * Validates a drafted tree against the shared guardrails and returns the KI fields to write.
 * A failing draft is skipped. Status stays tentative: this slice does not see the analyst gate.
 */
export const persistDecisionTree = ({
  symptom,
  kiId,
  priorMermaid = '',
  priorVersion = 0,
  mermaid,
  applicability = '',
  evidenceGathererMetadata,
  keywords,
}: PersistDecisionTreeInput): PersistDecisionTreeResult => {
  const trimmedSymptom = symptom.trim();
  const trimmedKiId = kiId.trim();
  if (!trimmedSymptom || !trimmedKiId) {
    return emptyResult('Symptom is required');
  }

  let diagram = mermaid.trim();
  if (!diagram) {
    return emptyResult('Decision tree diagram is empty', trimmedSymptom, trimmedKiId);
  }
  try {
    diagram = extractMermaid(diagram).trim();
  } catch (error) {
    return emptyResult(
      error instanceof Error ? error.message : 'Decision tree diagram could not be read',
      trimmedSymptom,
      trimmedKiId
    );
  }
  if (diagram.length > MAX_MERMAID_CHARS) {
    return emptyResult(
      'Decision tree diagram exceeds the knowledge item content cap',
      trimmedSymptom,
      trimmedKiId
    );
  }

  const treeId = symptomTreeId(trimmedSymptom);
  const evidence = boundedList(evidenceGathererMetadata, MAX_EVIDENCE_ENTRIES, MAX_EVIDENCE_ENTRY_CHARS);
  const prior = priorMermaid.trim();

  try {
    const tree = parseMermaidDecisionTree(diagram, treeId);
    enforceMinimumGraph(tree);
    validateEvidenceMetadata(treeId, evidence);
    if (prior) {
      enforceRawSizeFloor({ treeId, originalMermaid: prior, newMermaid: diagram });
      enforceParsedSizeFloor({ treeId, originalMermaid: prior, newTree: tree });
      enforceNodePreservation({
        treeId,
        originalMermaid: prior,
        newNodeIds: new Set(tree.nodes.map((node) => node.node_id)),
      });
    }
  } catch (error) {
    const reason =
      error instanceof DecisionTreeValidationError || error instanceof Error
        ? error.message
        : 'Decision tree failed validation';
    return emptyResult(reason, trimmedSymptom, trimmedKiId);
  }

  const description = (applicability.trim() || `Decision tree for ${trimmedSymptom}`).slice(
    0,
    MAX_DESCRIPTION_CHARS
  );
  const version = prior ? Math.max(0, priorVersion) + 1 : 1;

  return {
    skipped: false,
    reason: '',
    kiId: trimmedKiId,
    type: SECURITY_DECISION_TREE_TYPE,
    title: titleFromSymptom(trimmedSymptom),
    description,
    content: diagram,
    tag: SECURITY_DECISION_TREE_TAG,
    status: SECURITY_DECISION_TREE_STATUS_TENTATIVE,
    version,
    symptom: trimmedSymptom,
    evidenceGathererMetadata: evidence,
    keywords: boundedList(keywords, MAX_KEYWORDS, MAX_KEYWORD_CHARS),
  };
};
