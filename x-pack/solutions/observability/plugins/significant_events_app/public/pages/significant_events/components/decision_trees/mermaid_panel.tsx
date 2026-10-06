/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonGroup, EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DecisionEdgeView, DecisionNodeView } from '@kbn/nightshift-decision-trees';
import { DecisionTreeGraph } from './decision_tree_graph';

interface MermaidPanelProps {
  mermaid: string;
  nodes: DecisionNodeView[];
  edges: DecisionEdgeView[];
}

type MermaidView = 'diagram' | 'source';

/**
 * Renders the tree as a diagram, with a toggle to the raw Mermaid source. Falls back to the
 * source alone when the Mermaid could not be parsed into nodes.
 */
export function MermaidPanel({ mermaid, nodes, edges }: MermaidPanelProps) {
  const [view, setView] = useState<MermaidView>('diagram');

  if (mermaid.length === 0) {
    return (
      <EuiText color="subdued" size="s" data-test-subj="nightshiftDecisionTreeMermaidEmpty">
        {i18n.translate('xpack.significantEventsApp.decisionTrees.mermaid.empty', {
          defaultMessage: 'No Mermaid diagram is available for this tree.',
        })}
      </EuiText>
    );
  }

  const source = (
    <EuiCodeBlock
      language="text"
      fontSize="s"
      paddingSize="m"
      isCopyable
      overflowHeight={400}
      data-test-subj="nightshiftDecisionTreeMermaid"
    >
      {mermaid}
    </EuiCodeBlock>
  );

  if (nodes.length === 0) {
    return source;
  }

  return (
    <>
      <EuiButtonGroup
        legend={i18n.translate('xpack.significantEventsApp.decisionTrees.mermaid.viewLegend', {
          defaultMessage: 'Decision tree view',
        })}
        buttonSize="compressed"
        idSelected={view}
        onChange={(id) => setView(id as MermaidView)}
        options={[
          {
            id: 'diagram',
            label: i18n.translate('xpack.significantEventsApp.decisionTrees.mermaid.diagram', {
              defaultMessage: 'Diagram',
            }),
          },
          {
            id: 'source',
            label: i18n.translate('xpack.significantEventsApp.decisionTrees.mermaid.source', {
              defaultMessage: 'Source',
            }),
          },
        ]}
        data-test-subj="nightshiftDecisionTreeMermaidViewToggle"
      />
      <EuiSpacer size="s" />
      {view === 'diagram' ? (
        <DecisionTreeGraph key={mermaid} nodes={nodes} edges={edges} />
      ) : (
        source
      )}
    </>
  );
}
