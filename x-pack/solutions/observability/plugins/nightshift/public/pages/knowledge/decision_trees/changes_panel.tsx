/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DecisionTreeDiff } from '@kbn/nightshift-decision-trees';
import { useDecisionTreeVersion } from './use_decision_trees';

interface ChangesPanelProps {
  symptom: string;
  version: number;
}

const PREFIX_LABELS = {
  nodeAdded: i18n.translate('xpack.nightshift.knowledge.decisionTrees.changes.nodeAddedPrefix', {
    defaultMessage: '+ node',
  }),
  nodeRemoved: i18n.translate(
    'xpack.nightshift.knowledge.decisionTrees.changes.nodeRemovedPrefix',
    { defaultMessage: '- node' }
  ),
  nodeModified: i18n.translate(
    'xpack.nightshift.knowledge.decisionTrees.changes.nodeModifiedPrefix',
    { defaultMessage: '~ node' }
  ),
  edgeAdded: i18n.translate('xpack.nightshift.knowledge.decisionTrees.changes.edgeAddedPrefix', {
    defaultMessage: '+ edge',
  }),
  edgeRemoved: i18n.translate(
    'xpack.nightshift.knowledge.decisionTrees.changes.edgeRemovedPrefix',
    { defaultMessage: '- edge' }
  ),
  edgeModified: i18n.translate(
    'xpack.nightshift.knowledge.decisionTrees.changes.edgeModifiedPrefix',
    { defaultMessage: '~ edge' }
  ),
};

const NOW_CAUSAL_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.decisionTrees.changes.nowCausal',
  {
    defaultMessage: 'now causal',
  }
);

const NO_LONGER_CAUSAL_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.decisionTrees.changes.noLongerCausal',
  { defaultMessage: 'no longer causal' }
);

const DiffLine = ({ color, prefix, text }: { color: string; prefix: string; text: string }) => (
  <EuiText size="s">
    <EuiBadge color={color}>{prefix}</EuiBadge> {text}
  </EuiText>
);

const DiffContent = ({ diff }: { diff: DecisionTreeDiff }) => {
  const hasChanges =
    diff.nodes_added.length > 0 ||
    diff.nodes_removed.length > 0 ||
    diff.nodes_modified.length > 0 ||
    diff.edges_added.length > 0 ||
    diff.edges_removed.length > 0 ||
    diff.edges_modified.length > 0;

  if (!hasChanges) {
    return (
      <EuiText color="subdued" size="s">
        {i18n.translate('xpack.nightshift.knowledge.decisionTrees.changes.none', {
          defaultMessage: 'No structural changes in this version.',
        })}
      </EuiText>
    );
  }

  return (
    <div data-test-subj="nightshiftDecisionTreeChangesContent">
      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="success">
            {i18n.translate('xpack.nightshift.knowledge.decisionTrees.changes.nodesAdded', {
              defaultMessage: '{count} nodes added',
              values: { count: diff.nodes_added.length },
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="warning">
            {i18n.translate('xpack.nightshift.knowledge.decisionTrees.changes.nodesModified', {
              defaultMessage: '{count} nodes modified',
              values: { count: diff.nodes_modified.length },
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="danger">
            {i18n.translate('xpack.nightshift.knowledge.decisionTrees.changes.nodesRemoved', {
              defaultMessage: '{count} nodes removed',
              values: { count: diff.nodes_removed.length },
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="success">
            {i18n.translate('xpack.nightshift.knowledge.decisionTrees.changes.edgesAdded', {
              defaultMessage: '{count} edges added',
              values: { count: diff.edges_added.length },
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="warning">
            {i18n.translate('xpack.nightshift.knowledge.decisionTrees.changes.edgesModified', {
              defaultMessage: '{count} edges modified',
              values: { count: diff.edges_modified.length },
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="danger">
            {i18n.translate('xpack.nightshift.knowledge.decisionTrees.changes.edgesRemoved', {
              defaultMessage: '{count} edges removed',
              values: { count: diff.edges_removed.length },
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup direction="column" gutterSize="xs">
        {diff.nodes_added.map((node) => (
          <EuiFlexItem key={`node-add-${node.node_id}`} grow={false}>
            <DiffLine
              color="success"
              prefix={PREFIX_LABELS.nodeAdded}
              text={`${node.node_id} — ${node.label}`}
            />
          </EuiFlexItem>
        ))}
        {diff.nodes_removed.map((node) => (
          <EuiFlexItem key={`node-remove-${node.node_id}`} grow={false}>
            <DiffLine
              color="danger"
              prefix={PREFIX_LABELS.nodeRemoved}
              text={`${node.node_id} — ${node.label}`}
            />
          </EuiFlexItem>
        ))}
        {diff.nodes_modified.map((change) => (
          <EuiFlexItem key={`node-mod-${change.node_id}`} grow={false}>
            <DiffLine
              color="warning"
              prefix={PREFIX_LABELS.nodeModified}
              text={`${change.node_id} (${change.changed_fields.join(', ')})`}
            />
          </EuiFlexItem>
        ))}
        {diff.edges_added.map((edge, index) => (
          <EuiFlexItem key={`edge-add-${index}`} grow={false}>
            <DiffLine
              color="success"
              prefix={PREFIX_LABELS.edgeAdded}
              text={`${edge.source_node_id} → ${edge.target_node_id} (${edge.condition})`}
            />
          </EuiFlexItem>
        ))}
        {diff.edges_removed.map((edge, index) => (
          <EuiFlexItem key={`edge-remove-${index}`} grow={false}>
            <DiffLine
              color="danger"
              prefix={PREFIX_LABELS.edgeRemoved}
              text={`${edge.source_node_id} → ${edge.target_node_id} (${edge.condition})`}
            />
          </EuiFlexItem>
        ))}
        {diff.edges_modified.map((change, index) => (
          <EuiFlexItem key={`edge-mod-${index}`} grow={false}>
            <DiffLine
              color="warning"
              prefix={PREFIX_LABELS.edgeModified}
              text={`${change.after.source_node_id} → ${change.after.target_node_id} (${
                change.after.is_taken ? NOW_CAUSAL_LABEL : NO_LONGER_CAUSAL_LABEL
              })`}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};

export function ChangesPanel({ symptom, version }: ChangesPanelProps) {
  const { data, isLoading, isError } = useDecisionTreeVersion(symptom, version);

  if (isLoading) {
    return <EuiLoadingSpinner size="m" data-test-subj="nightshiftDecisionTreeChangesLoading" />;
  }

  if (isError || !data) {
    return (
      <EuiText color="subdued" size="s">
        {i18n.translate('xpack.nightshift.knowledge.decisionTrees.changes.error', {
          defaultMessage: 'Could not load changes for this version.',
        })}
      </EuiText>
    );
  }

  if (!data.version.diff) {
    return (
      <EuiText color="subdued" size="s" data-test-subj="nightshiftDecisionTreeChangesInitial">
        {i18n.translate('xpack.nightshift.knowledge.decisionTrees.changes.initial', {
          defaultMessage: 'Version 1 is the initial tree, so it has no prior version to compare.',
        })}
      </EuiText>
    );
  }

  return <DiffContent diff={data.version.diff} />;
}
