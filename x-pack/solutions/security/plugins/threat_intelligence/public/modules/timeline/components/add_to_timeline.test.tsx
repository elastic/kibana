/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { generateMockIndicator, Indicator } from '../../../../common/types/indicator';
import { EMPTY_VALUE } from '../../../constants/common';
import {
  AddToTimelineButtonEmpty,
  AddToTimelineButtonIcon,
  AddToTimelineContextMenu,
} from './add_to_timeline';
import { TestProvidersComponent } from '../../../mocks/test_providers';

const TEST_ID = 'test';
const TIMELINE_TEST_ID = 'test-add-to-timeline';

describe('<AddToTimelineButtonIcon /> <AddToTimelineContextMenu />', () => {
  it('should render timeline button when Indicator data', () => {
    const mockField: string = 'threat.indicator.ip';
    const mockData: Indicator = generateMockIndicator();

    const { getByTestId, getAllByText } = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockData} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveClass('euiFlexItem');
    expect(getByTestId(TIMELINE_TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Add To Timeline')).toHaveLength(1);
  });

  it('should render timeline button when string data', () => {
    const mockField: string = 'threat.indicator.ip';
    const mockString: string = 'ip';

    const { getByTestId, getAllByText } = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockString} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveClass('euiFlexItem');
    expect(getByTestId(TIMELINE_TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Add To Timeline')).toHaveLength(1);
  });

  it('should render EuiButtonEmpty when Indicator data', () => {
    const mockField: string = 'threat.indicator.ip';
    const mockData: Indicator = generateMockIndicator();

    const { getByTestId, getAllByText } = render(
      <TestProvidersComponent>
        <AddToTimelineButtonEmpty field={mockField} data={mockData} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveClass('euiButtonEmpty');
    expect(getByTestId(TIMELINE_TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Add To Timeline')).toHaveLength(1);
  });

  it('should render EuiButtonEmpty when string data', () => {
    const mockField: string = 'threat.indicator.ip';
    const mockString: string = 'ip';

    const { getByTestId, getAllByText } = render(
      <TestProvidersComponent>
        <AddToTimelineButtonEmpty field={mockField} data={mockString} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveClass('euiButtonEmpty');
    expect(getByTestId(TIMELINE_TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Add To Timeline')).toHaveLength(1);
  });

  it('should render EuiContextMenuItem when Indicator data', () => {
    const mockField: string = 'threat.indicator.ip';
    const mockData: Indicator = generateMockIndicator();

    const { getByTestId, getAllByText } = render(
      <TestProvidersComponent>
        <AddToTimelineContextMenu field={mockField} data={mockData} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveClass('euiContextMenuItem');
    expect(getByTestId(TIMELINE_TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Add To Timeline')).toHaveLength(1);
  });

  it('should render EuiContextMenuItem when string data', () => {
    const mockField: string = 'threat.indicator.ip';
    const mockString: string = 'ip';

    const { getByTestId, getAllByText } = render(
      <TestProvidersComponent>
        <AddToTimelineContextMenu field={mockField} data={mockString} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveClass('euiContextMenuItem');
    expect(getByTestId(TIMELINE_TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Add To Timeline')).toHaveLength(1);
  });

  it(`should render empty component when field doesn't exist in data`, () => {
    const mockField: string = 'abc';
    const mockData: Indicator = generateMockIndicator();

    const { container } = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockData} />
      </TestProvidersComponent>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it(`should render empty component when field exist in data but isn't supported`, () => {
    const mockField: string = 'abc';
    const mockData: Indicator = generateMockIndicator();
    mockData.fields['threat.indicator.type'] = ['abc'];

    const { container } = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockData} />
      </TestProvidersComponent>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it(`should render empty component when calculated value is ${EMPTY_VALUE}`, () => {
    const mockField: string = 'threat.indicator.first_seen';
    const mockData: Indicator = generateMockIndicator();
    mockData.fields['threat.indicator.first_seen'] = [''];

    const { container } = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockData} />
      </TestProvidersComponent>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it(`should render empty component when data is ${EMPTY_VALUE}`, () => {
    const mockField: string = 'threat.indicator.ip';
    const mockData = EMPTY_VALUE;

    const { container } = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockData} />
      </TestProvidersComponent>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
