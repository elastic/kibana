/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import { DecisionTreeNode, type DecisionTreeFlowNode } from './decision_tree_nodes';

const renderNode = (data: DecisionTreeFlowNode['data']) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <ReactFlowProvider>
          <DecisionTreeNode
            {...({ id: 'node', data } as NodeProps<DecisionTreeFlowNode>)}
          />
        </ReactFlowProvider>
      </I18nProvider>
    </EuiProvider>
  );

describe('DecisionTreeNode markdown', () => {
  it('styles inline code in the conclusion the same way as the investigation flyout', () => {
    const { container } = renderNode({
      kind: 'conclusion',
      conclusion: 'The `user_id` field was missing.\n\n```text\nkubectl get pods\n```',
      isSelected: false,
      isDimmed: false,
      selectedActionIndex: null,
    });

    const inlineCode = container.querySelector('p code');
    expect(inlineCode).toHaveTextContent('user_id');
    expect(inlineCode?.textContent).not.toContain('`');

    const blockCode = container.querySelector('pre code');
    expect(blockCode).toHaveTextContent('kubectl get pods');
    expect(blockCode).toHaveAttribute('data-code-language', 'text');
  });

  it('styles inline code in a hypothesis reason', () => {
    const { container } = renderNode({
      kind: 'hypothesis',
      index: 0,
      isWinner: true,
      hypothesis: {
        candidate: 'Mapping gap',
        confidence: 0.9,
        status: 'confirmed',
        reason: 'Filters on `user_id` returned nothing.',
      },
      isSelected: false,
      isDimmed: false,
      selectedActionIndex: null,
    });

    expect(container.querySelector('code')).toHaveTextContent('user_id');
  });
});
