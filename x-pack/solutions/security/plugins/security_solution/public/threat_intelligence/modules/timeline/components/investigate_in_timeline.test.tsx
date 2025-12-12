/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  generateMockIndicator,
  generateMockUrlIndicator,
  type Indicator,
} from '../../../../../common/threat_intelligence/types/indicator';
import { TestProvidersComponent } from '../../../mocks/test_providers';
import {
  InvestigateInTimelineButtonIcon,
  InvestigateInTimelineContextMenu,
} from './investigate_in_timeline';
import { EMPTY_VALUE } from '../../../constants/common';
import { useInvestigateInTimeline } from '../../../hooks/use_investigate_in_timeline';
import { extractTimelineCapabilities } from '../../../../common/utils/timeline_capabilities';

const TEST_ID = 'test';

jest.mock('../../../../common/utils/timeline_capabilities');
jest.mock('../../../hooks/use_investigate_in_timeline', () => ({
  useInvestigateInTimeline: jest.fn(),
}));

describe('<InvestigateInTimelineContextMenu /> <InvestigateInTimelineButtonIcon />', () => {
  beforeEach(() => {
    (extractTimelineCapabilities as jest.Mock).mockReturnValue({ read: true });

    jest
      .mocked(useInvestigateInTimeline)
      .mockReturnValue({ investigateInTimelineFn: jest.fn() } as ReturnType<
        typeof useInvestigateInTimeline
      >);
  });

  it('should render EuiContextMenuItem when Indicator data is correct', () => {
    const mockData: Indicator = generateMockUrlIndicator();

    const { getByTestId, getAllByText } = render(
      <TestProvidersComponent>
        <InvestigateInTimelineContextMenu data={mockData} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TEST_ID)).toHaveClass('euiContextMenuItem');
    expect(getAllByText('Investigate in Timeline')).toHaveLength(1);
  });

  it('should render empty component when Indicator data is incorrect', () => {
    const mockData: Indicator = generateMockIndicator();
    mockData.fields['threat.indicator.first_seen'] = [''];

    jest.mocked(useInvestigateInTimeline).mockReturnValue({
      investigateInTimelineActionItems: [],
    } as unknown as ReturnType<typeof useInvestigateInTimeline>);

    const { container } = render(
      <TestProvidersComponent>
        <InvestigateInTimelineContextMenu data={mockData} />
      </TestProvidersComponent>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render EuiButtonIcon when Indicator data is correct', () => {
    const mockData: Indicator = generateMockUrlIndicator();

    const { getByTestId } = render(
      <TestProvidersComponent>
        <InvestigateInTimelineButtonIcon data={mockData} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TEST_ID)).toHaveClass('euiButtonIcon');
  });

  it(`should render empty component when calculated value is ${EMPTY_VALUE}`, () => {
    const mockData: Indicator = generateMockIndicator();
    mockData.fields['threat.indicator.first_seen'] = [''];

    jest.mocked(useInvestigateInTimeline).mockReturnValue({
      investigateInTimelineActionItems: [],
    } as unknown as ReturnType<typeof useInvestigateInTimeline>);

    const { container } = render(
      <TestProvidersComponent>
        <InvestigateInTimelineButtonIcon data={mockData} />
      </TestProvidersComponent>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render an empty component when the user does not have access to timeline', () => {
    const mockData: Indicator = generateMockUrlIndicator();

    (extractTimelineCapabilities as jest.Mock).mockReturnValue({ read: false });

    const { container } = render(
      <TestProvidersComponent>
        <InvestigateInTimelineContextMenu data={mockData} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
