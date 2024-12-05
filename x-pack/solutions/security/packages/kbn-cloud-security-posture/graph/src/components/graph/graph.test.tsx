/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Graph, type GraphProps } from './graph';
import { TestProviders } from '../mock/test_providers';

const renderGraphPreview = (props: GraphProps) =>
  render(
    <TestProviders>
      <Graph {...props} />
    </TestProviders>
  );

describe('<Graph />', () => {
  it('should render empty graph', () => {
    const { container } = renderGraphPreview({
      nodes: [],
      edges: [],
      interactive: false,
    });

    expect(container).not.toBeNull();
    const nodes = container.querySelectorAll('.react-flow__nodes .react-flow__node');
    expect(nodes).toHaveLength(0);
  });

  it('should render hexagon node', () => {
    const { container } = renderGraphPreview({
      nodes: [
        {
          id: '1',
          label: 'Node 1',
          color: 'primary',
          shape: 'hexagon',
        },
      ],
      edges: [],
      interactive: false,
    });

    const nodeEl = container.querySelector('[data-id="1"]');
    expect(nodeEl).not.toBeNull();
    expect(nodeEl?.textContent).toBe('Node 1');
  });

  it('should render label node', () => {
    const { container } = renderGraphPreview({
      nodes: [
        {
          id: '2',
          label: 'Node 2',
          color: 'primary',
          shape: 'label',
        },
      ],
      edges: [],
      interactive: false,
    });

    const nodeEl = container.querySelector('[data-id="2"]');
    expect(nodeEl).not.toBeNull();
    expect(nodeEl?.textContent).toBe('Node 2');
  });

  it('should render 2 nodes connected', () => {
    const { container } = renderGraphPreview({
      nodes: [
        {
          id: '1',
          label: 'Node 1',
          color: 'primary',
          shape: 'hexagon',
        },
        {
          id: '2',
          label: 'Node 2',
          color: 'primary',
          shape: 'label',
        },
      ],
      edges: [
        {
          id: 'a(1)-b(2)',
          color: 'primary',
          source: '1',
          target: '2',
        },
      ],
      interactive: false,
    });

    const srcNodeEl = container.querySelector('[data-id="1"]');
    expect(srcNodeEl).not.toBeNull();
    expect(srcNodeEl?.textContent).toBe('Node 1');

    const targetNodeEl = container.querySelector('[data-id="2"]');
    expect(targetNodeEl).not.toBeNull();
    expect(targetNodeEl?.textContent).toBe('Node 2');

    // TODO: Fix this test (currently it is not rendered in xyflow version 12) https://github.com/xyflow/xyflow/issues/716#issuecomment-2414721074
    // const edgeEl = container.querySelector('[data-id="a(1)-b(2)"]');
    // expect(edgeEl).not.toBeNull();
  });
});
