/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import React from 'react';

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
  },
  {
    color: '#2B70F7',
    dataProviderId:
      'draggable-legend-item-83f6c824-811d-4ec8-b373-eba2b0de6398-event_dataset-suricata_eve',
    field: 'event.dataset',
    value: 'suricata.eve',
  },
  {
    color: '#CE0060',
    dataProviderId:
      'draggable-legend-item-ec57bb8f-82cd-4e07-bd38-1d11b3f0ee5f-event_dataset-traefik_access',
    field: 'event.dataset',
    value: 'traefik.access',
  },
  {
    color: '#38007E',
    dataProviderId:
      'draggable-legend-item-25d5fcd6-87ba-46b5-893e-c655d7d504e3-event_dataset-esensor',
    field: 'event.dataset',
    value: 'esensor',
  },
];

describe('DraggableLegend', () => {
  const height = 400;
  describe('rendering', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      wrapper = mount(
        <TestProviders>
          <DraggableLegend height={height} legendItems={legendItems} />
        </TestProviders>
      );
    });

    it(`renders a container with the specified non-zero 'height'`, () => {
      expect(wrapper.find('[data-test-subj="draggable-legend"]').first()).toHaveStyleRule(
        'height',
        `${height}px`
      );
    });

    it(`renders a container with the default 'min-width'`, () => {
      expect(wrapper.find('[data-test-subj="draggable-legend"]').first()).toHaveStyleRule(
        'min-width',
        `${DEFAULT_WIDTH}px`
      );
    });

    it(`renders a container with the specified 'min-width'`, () => {
      const width = 1234;

      wrapper = mount(
        <TestProviders>
          <DraggableLegend height={height} legendItems={legendItems} minWidth={width} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="draggable-legend"]').first()).toHaveStyleRule(
        'min-width',
        `${width}px`
      );
    });

    it('scrolls when necessary', () => {
      expect(wrapper.find('[data-test-subj="draggable-legend"]').first()).toHaveStyleRule(
        'overflow',
        'auto'
      );
    });

    it('renders the legend items', () => {
      legendItems.forEach((item) =>
        expect(
          wrapper.find(`[data-test-subj="legend-item-${item.dataProviderId}"]`).first().text()
        ).toEqual(item.value)
      );
    });

    it('renders a spacer for every legend item', () => {
      expect(wrapper.find('[data-test-subj="draggable-legend-spacer"]').hostNodes().length).toEqual(
        legendItems.length
      );
    });
  });

  it('does NOT render the legend when an empty collection of legendItems is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DraggableLegend height={height} legendItems={[]} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="draggable-legend"]').exists()).toBe(false);
  });

  it(`renders a legend with the minimum height when 'height' is zero`, () => {
    const wrapper = mount(
      <TestProviders>
        <DraggableLegend height={0} legendItems={legendItems} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="draggable-legend"]').first()).toHaveStyleRule(
      'height',
      `${MIN_LEGEND_HEIGHT}px`
    );
  });

  it('renders a legend with specified class names', () => {
    const wrapper = mount(
      <TestProviders>
        <DraggableLegend className="foo bar baz" height={0} legendItems={legendItems} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="draggable-legend"]').first().getDOMNode()).toHaveClass(
      'foo',
      'bar',
      'baz'
    );
  });
});
