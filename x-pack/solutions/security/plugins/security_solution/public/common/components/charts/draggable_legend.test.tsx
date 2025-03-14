/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, render } from '@testing-library/react';
import React from 'react';
import { matchers } from '@emotion/jest';

expect.extend(matchers);

import '../../mock/react_beautiful_dnd';
import { TestProviders } from '../../mock';

import { DEFAULT_WIDTH, MIN_LEGEND_HEIGHT, DraggableLegend } from './draggable_legend';
import type { LegendItem } from './draggable_legend_item';

jest.mock('../../lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

const legendItems: LegendItem[] = [
  {
    color: '#1EA593',
    dataProviderId: 'draggable-legend-item-3207fda7-d008-402a-86a0-8ad632081bad-event_dataset-flow',
    field: 'event.dataset',
    value: 'flow',
    scopeId: 'test',
  },
  {
    color: '#2B70F7',
    dataProviderId:
      'draggable-legend-item-83f6c824-811d-4ec8-b373-eba2b0de6398-event_dataset-suricata_eve',
    field: 'event.dataset',
    value: 'suricata.eve',
    scopeId: 'test',
  },
  {
    color: '#CE0060',
    dataProviderId:
      'draggable-legend-item-ec57bb8f-82cd-4e07-bd38-1d11b3f0ee5f-event_dataset-traefik_access',
    field: 'event.dataset',
    value: 'traefik.access',
    scopeId: 'test',
  },
  {
    color: '#38007E',
    dataProviderId:
      'draggable-legend-item-25d5fcd6-87ba-46b5-893e-c655d7d504e3-event_dataset-esensor',
    field: 'event.dataset',
    value: 'esensor',
    scopeId: 'test',
  },
];

describe('DraggableLegend', () => {
  const height = 400;

  it(`renders a container with the specified non-zero 'height'`, () => {
    render(
      <TestProviders>
        <DraggableLegend height={height} legendItems={legendItems} />
      </TestProviders>
    );
    expect(screen.getByTestId('draggable-legend')).toHaveStyleRule('height', `${height}px`);
  });

  it("renders a container with the default 'min-width'", () => {
    render(
      <TestProviders>
        <DraggableLegend height={height} legendItems={legendItems} />
      </TestProviders>
    );
    expect(screen.getByTestId('draggable-legend')).toHaveStyleRule(
      'min-width',
      `${DEFAULT_WIDTH}px`
    );
  });

  it(`renders a container with the specified 'min-width'`, () => {
    const width = 1234;

    render(
      <TestProviders>
        <DraggableLegend height={height} legendItems={legendItems} minWidth={width} />
      </TestProviders>
    );

    expect(screen.getByTestId('draggable-legend')).toHaveStyleRule('min-width', `${width}px`);
  });

  it('scrolls when necessary', () => {
    render(
      <TestProviders>
        <DraggableLegend height={height} legendItems={legendItems} />
      </TestProviders>
    );
    expect(screen.getByTestId('draggable-legend')).toHaveStyleRule('overflow', 'auto');
  });

  it('renders the legend items', () => {
    const { container } = render(
      <TestProviders>
        <DraggableLegend height={height} legendItems={legendItems} />
      </TestProviders>
    );

    legendItems.forEach((item) =>
      expect(
        container.querySelector(`[data-provider-id="draggableId.content.${item.dataProviderId}"]`)
      ).toHaveTextContent(item.value.toString())
    );
  });

  it('renders a spacer for every legend item', () => {
    render(
      <TestProviders>
        <DraggableLegend height={height} legendItems={legendItems} />
      </TestProviders>
    );
    expect(screen.getAllByTestId('draggable-legend-spacer').length).toEqual(legendItems.length);
  });

  it('does NOT render the legend when an empty collection of legendItems is provided', async () => {
    render(
      <TestProviders>
        <DraggableLegend height={height} legendItems={[]} />
      </TestProviders>
    );

    expect(screen.queryByTestId('draggable-legend')).toBeNull();
  });

  it(`renders a legend with the minimum height when 'height' is zero`, () => {
    render(
      <TestProviders>
        <DraggableLegend height={0} legendItems={legendItems} />
      </TestProviders>
    );

    expect(screen.getByTestId('draggable-legend')).toHaveStyleRule(
      'height',
      `${MIN_LEGEND_HEIGHT}px`
    );
  });

  it('renders a legend with specified class names', () => {
    render(
      <TestProviders>
        <DraggableLegend className="foo bar baz" height={0} legendItems={legendItems} />
      </TestProviders>
    );

    expect(screen.getByTestId('draggable-legend')).toHaveClass('foo', 'bar', 'baz');
  });
});
