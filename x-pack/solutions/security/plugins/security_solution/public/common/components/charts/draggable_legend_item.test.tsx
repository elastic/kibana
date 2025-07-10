/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import '../../mock/react_beautiful_dnd';
import { TestProviders } from '../../mock';

import type { LegendItem } from './draggable_legend_item';
import { DraggableLegendItem } from './draggable_legend_item';

jest.mock('../../lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

const MockSecurityCellActions = jest.fn(({ children }: { children: React.ReactNode }) => (
  <div data-test-subj="mockSecurityCellActions">{children}</div>
));
jest.mock('../cell_actions', () => ({
  ...jest.requireActual('../cell_actions'),
  SecurityCellActions: (params: { children: React.ReactNode }) => MockSecurityCellActions(params),
}));

describe('DraggableLegendItem', () => {
  const legendItem: LegendItem = {
    color: '#1EA593',
    dataProviderId: 'draggable-legend-item-3207fda7-d008-402a-86a0-8ad632081bad-event_dataset-flow',
    field: 'event.dataset',
    value: 'flow',
    scopeId: 'test',
  };

  it('renders a colored circle with the expected legend item color', () => {
    render(
      <TestProviders>
        <DraggableLegendItem legendItem={legendItem} />
      </TestProviders>
    );

    const colorElement = screen.getByTestId('legend-color');
    expect(colorElement).toMatchInlineSnapshot(`
      <div
        class="euiHealth emotion-euiHealth-s"
        data-test-subj="legend-color"
      >
        <div
          class="euiFlexGroup emotion-euiFlexGroup-xs-flexStart-center-row"
        >
          <div
            class="euiFlexItem emotion-euiFlexItem-growZero"
          >
            <span
              color="${legendItem.color}"
              data-euiicon-type="dot"
            />
          </div>
          <div
            class="euiFlexItem emotion-euiFlexItem-growZero"
          />
        </div>
      </div>
    `);
  });

  it('renders draggable legend item text', () => {
    const { container } = render(
      <TestProviders>
        <DraggableLegendItem legendItem={legendItem} />
      </TestProviders>
    );

    const legendItemElement = container.querySelector(
      `[data-provider-id="draggableId.content.${legendItem.dataProviderId}"]`
    );
    expect(legendItemElement).toHaveTextContent(String(legendItem.value));
  });

  it('renders a custom legend item via the `render` prop when provided', () => {
    const renderContent = (fieldValuePair?: { field: string; value: string | number }) => (
      <div data-test-subj="custom">{`${fieldValuePair?.field} - ${fieldValuePair?.value}`}</div>
    );

    const customLegendItem = { ...legendItem, render: renderContent };

    render(
      <TestProviders>
        <DraggableLegendItem legendItem={customLegendItem} />
      </TestProviders>
    );

    const customElement = screen.getByTestId('custom');
    expect(customElement).toHaveTextContent(`${legendItem.field} - ${legendItem.value}`);
  });

  it('renders an item count via the `count` prop when provided', () => {
    const customLegendItem = { ...legendItem, count: 1234 };

    render(
      <TestProviders>
        <DraggableLegendItem legendItem={customLegendItem} />
      </TestProviders>
    );

    expect(screen.getByTestId('legendItemCount')).toBeInTheDocument();
  });

  it('always hides the Top N action for legend items', () => {
    render(
      <TestProviders>
        <DraggableLegendItem legendItem={legendItem} />
      </TestProviders>
    );

    expect(screen.getByTestId('mockSecurityCellActions')).toBeInTheDocument();
    expect(MockSecurityCellActions).toHaveBeenCalledWith(
      expect.objectContaining({
        disabledActionTypes: ['security-cellAction-type-showTopN'],
      })
    );
  });

  it('renders the empty value label when the value is empty', () => {
    render(
      <TestProviders>
        <DraggableLegendItem legendItem={{ ...legendItem, value: '' }} />
      </TestProviders>
    );
    expect(screen.getByTestId('value-wrapper-empty')).toBeInTheDocument();
  });

  it('does not render the empty value label when the value is a number', () => {
    render(
      <TestProviders>
        <DraggableLegendItem legendItem={{ ...legendItem, value: 0 }} />
      </TestProviders>
    );
    expect(screen.queryByTestId('value-wrapper-empty')).not.toBeInTheDocument();
  });

  describe('when actions are inline', () => {
    it('renders the legend item content', () => {
      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <DraggableLegendItem legendItem={legendItem} isInlineActions />
        </TestProviders>
      );

      expect(queryByTestId(`legend-item-${legendItem.dataProviderId}`)).not.toBeInTheDocument();
      expect(getByTestId('legendItemInlineActions')).toBeInTheDocument();
    });
  });
});
