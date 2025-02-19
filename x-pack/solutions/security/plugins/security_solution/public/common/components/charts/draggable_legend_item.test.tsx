/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import React from 'react';
import { render } from '@testing-library/react';

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

describe('DraggableLegendItem', () => {
  const legendItem: LegendItem = {
    color: '#1EA593',
    dataProviderId: 'draggable-legend-item-3207fda7-d008-402a-86a0-8ad632081bad-event_dataset-flow',
    field: 'event.dataset',
    value: 'flow',
    scopeId: 'test',
  };

  let wrapper: ReactWrapper;

  beforeEach(() => {
    wrapper = mount(
      <TestProviders>
        <DraggableLegendItem legendItem={legendItem} />
      </TestProviders>
    );
  });

  it('renders a colored circle with the expected legend item color', () => {
    expect(wrapper.find('[data-test-subj="legend-color"]').first().props().color).toEqual(
      legendItem.color
    );
  });

  it('renders draggable legend item text', () => {
    expect(
      wrapper.find(`[data-test-subj="legend-item-${legendItem.dataProviderId}"]`).first().text()
    ).toEqual(legendItem.value);
  });

  it('renders a custom legend item via the `render` prop when provided', () => {
    const renderContent = (fieldValuePair?: { field: string; value: string | number }) => (
      <div data-test-subj="custom">{`${fieldValuePair?.field} - ${fieldValuePair?.value}`}</div>
    );

    const customLegendItem = { ...legendItem, render: renderContent };

    wrapper = mount(
      <TestProviders>
        <DraggableLegendItem legendItem={customLegendItem} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="custom"]`).first().text()).toEqual(
      `${legendItem.field} - ${legendItem.value}`
    );
  });

  it('renders an item count via the `count` prop when provided', () => {
    const customLegendItem = { ...legendItem, count: 1234 };

    wrapper = mount(
      <TestProviders>
        <DraggableLegendItem legendItem={customLegendItem} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="legendItemCount"]`).first().exists()).toBe(true);
  });

  it('always hides the Top N action for legend items', () => {
    expect(
      wrapper.find(`[data-test-subj="legend-item-${legendItem.dataProviderId}"]`).prop('hideTopN')
    ).toEqual(true);
  });

  it('renders the empty value label when the value is empty', () => {
    wrapper = mount(
      <TestProviders>
        <DraggableLegendItem legendItem={{ ...legendItem, value: '' }} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="value-wrapper-empty"]').first().exists()).toBeTruthy();
  });

  it('does not render the empty value label when the value is a number', () => {
    wrapper = mount(
      <TestProviders>
        <DraggableLegendItem legendItem={{ ...legendItem, value: 0 }} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="value-wrapper-empty"]').first().exists()).toBeFalsy();
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
