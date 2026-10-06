/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlow, useReactFlow } from '@xyflow/react';
import { TestProviders } from '../mock/test_providers';
import { mockReactFlow } from '../mock/react_flow';
import { useDetailLevel } from './use_detail_level';

const Probe = () => <div data-test-subj="level">{useDetailLevel()}</div>;

// Imperatively sets the viewport zoom so the ReactFlow store reflects it
// (jsdom ignores `defaultViewport` because the container has no real size).
const SetZoom = ({ zoom }: { zoom: number }) => {
  const { setViewport } = useReactFlow();
  useEffect(() => {
    setViewport({ x: 0, y: 0, zoom });
  }, [setViewport, zoom]);
  return null;
};

const renderAtZoom = (zoom: number) =>
  render(
    <TestProviders>
      <ReactFlow nodes={[]} edges={[]} fitView={false} minZoom={0.1} maxZoom={1.3}>
        <SetZoom zoom={zoom} />
        <Probe />
      </ReactFlow>
    </TestProviders>
  );

describe('useDetailLevel', () => {
  beforeAll(() => {
    mockReactFlow();
  });

  it('returns detailed at high zoom', async () => {
    renderAtZoom(1);
    await waitFor(() => expect(screen.getByTestId('level')).toHaveTextContent('detailed'));
  });

  it('returns simplified at low zoom', async () => {
    renderAtZoom(0.2);
    await waitFor(() => expect(screen.getByTestId('level')).toHaveTextContent('simplified'));
  });
});
