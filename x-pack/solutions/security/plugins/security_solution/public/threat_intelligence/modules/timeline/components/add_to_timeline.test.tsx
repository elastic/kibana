/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import {
  generateMockIndicator,
  type Indicator,
} from '../../../../../common/threat_intelligence/types/indicator';
import { EMPTY_VALUE } from '../../../constants/common';
import {
  AddToTimelineButtonEmpty,
  AddToTimelineButtonIcon,
  AddToTimelineContextMenu,
} from './add_to_timeline';
import { TestProvidersComponent } from '../../../mocks/test_providers';
import { useAddToTimelineButton } from '../hooks/use_add_to_timeline_button';
import { useAddToTimeline } from '../hooks/use_add_to_timeline';
import { extractTimelineCapabilities } from '../../../../common/utils/timeline_capabilities';

const TEST_ID = 'test';
const TIMELINE_TEST_ID = 'test-add-to-timeline';

vi.mock('../../../../common/utils/timeline_capabilities');
vi.mock('../hooks/use_add_to_timeline', () => {
  const mocked = {
    useAddToTimeline: vi.fn(() => ({ addToTimelineProps: {} })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../hooks/use_add_to_timeline_button', () => {
  const mocked = { useAddToTimelineButton: vi.fn() };
  return { ...mocked, default: mocked };
});

describe('<AddToTimelineButtonIcon /> <AddToTimelineContextMenu />', () => {
  beforeEach(() => {
    vi.mocked(useAddToTimelineButton).mockReturnValue(() => (
      <div data-test-subj={TIMELINE_TEST_ID} />
    ));

    (extractTimelineCapabilities as Mock).mockReturnValue({ read: true });
  });

  afterEach(() => vi.clearAllMocks());

  it('should render timeline button when Indicator data', () => {
    const mockField: string = 'threat.indicator.ip';
    const mockData: Indicator = generateMockIndicator();

    const { getByTestId } = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockData} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveClass('euiFlexItem');
    expect(getByTestId(TIMELINE_TEST_ID)).toBeInTheDocument();
  });

  it('should render timeline button when string data', () => {
    const mockField: string = 'threat.indicator.ip';
    const mockString: string = 'ip';

    const { getByTestId } = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockString} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveClass('euiFlexItem');
    expect(getByTestId(TIMELINE_TEST_ID)).toBeInTheDocument();
  });

  it('should render EuiButtonEmpty when Indicator data', () => {
    const mockField: string = 'threat.indicator.ip';
    const mockData: Indicator = generateMockIndicator();

    const { getByTestId } = render(
      <TestProvidersComponent>
        <AddToTimelineButtonEmpty field={mockField} data={mockData} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveClass('euiButtonEmpty');
    expect(getByTestId(TIMELINE_TEST_ID)).toBeInTheDocument();
  });

  it('should render EuiButtonEmpty when string data', () => {
    const mockField: string = 'threat.indicator.ip';
    const mockString: string = 'ip';

    const { getByTestId } = render(
      <TestProvidersComponent>
        <AddToTimelineButtonEmpty field={mockField} data={mockString} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveClass('euiButtonEmpty');
    expect(getByTestId(TIMELINE_TEST_ID)).toBeInTheDocument();
  });

  it('should render EuiContextMenuItem when Indicator data', () => {
    const mockField: string = 'threat.indicator.ip';
    const mockData: Indicator = generateMockIndicator();

    const { getByTestId } = render(
      <TestProvidersComponent>
        <AddToTimelineContextMenu field={mockField} data={mockData} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveClass('euiContextMenuItem');
    expect(getByTestId(TIMELINE_TEST_ID)).toBeInTheDocument();
  });

  it('should render EuiContextMenuItem when string data', () => {
    const mockField: string = 'threat.indicator.ip';
    const mockString: string = 'ip';

    const { getByTestId } = render(
      <TestProvidersComponent>
        <AddToTimelineContextMenu field={mockField} data={mockString} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveClass('euiContextMenuItem');
    expect(getByTestId(TIMELINE_TEST_ID)).toBeInTheDocument();
  });

  it(`should render empty component when field doesn't exist in data`, () => {
    const mockField: string = 'abc';
    const mockData: Indicator = generateMockIndicator();

    vi.mocked(useAddToTimeline).mockReturnValue({ addToTimelineProps: undefined });

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

    vi.mocked(useAddToTimeline).mockReturnValue({ addToTimelineProps: undefined });

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

    vi.mocked(useAddToTimeline).mockReturnValue({ addToTimelineProps: undefined });

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

    vi.mocked(useAddToTimeline).mockReturnValue({ addToTimelineProps: undefined });

    const { container } = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockData} />
      </TestProvidersComponent>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should render empty when the user does not have access to timeline', () => {
    (extractTimelineCapabilities as Mock).mockReturnValue({ read: false });

    const mockField: string = 'threat.indicator.ip';
    const mockData: Indicator = generateMockIndicator();

    const { container } = render(
      <TestProvidersComponent>
        <AddToTimelineContextMenu field={mockField} data={mockData} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
