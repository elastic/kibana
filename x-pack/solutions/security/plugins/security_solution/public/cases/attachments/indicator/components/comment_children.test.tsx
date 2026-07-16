/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import {
  CommentChildren,
  INDICATOR_FEED_NAME_TEST_ID,
  INDICATOR_NAME_TEST_ID,
  INDICATOR_TYPE_TEST_ID,
} from './comment_children';
import type { IndicatorAttachmentMetadata } from '..';
import { TestProvidersComponent } from '../../../../threat_intelligence/mocks/test_providers';
import { useIndicatorById } from '../hooks/use_indicator_by_id';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';
import { generateMockFileIndicator } from '../../../../../common/threat_intelligence/types/indicator';
import { LOADING_LOGO_TEST_ID } from './test_ids';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../flyout_v2/use_flyout_api.mock';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';

const mockOpenFlyout = jest.fn();

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: mockOpenFlyout }),
}));

jest.mock('../hooks/use_indicator_by_id');
jest.mock('../../../../flyout_v2/use_flyout_api');
jest.mock('../../../../common/hooks/use_is_new_flyout_enabled');

describe('attachment_children initComponent', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
  });

  it('should render the basic values', () => {
    const id: string = 'abc123';
    const metadata: IndicatorAttachmentMetadata = {
      indicatorName: 'indicatorName',
      indicatorFeedName: 'indicatorFeedName',
      indicatorType: 'indicatorType',
    };

    (useIndicatorById as jest.MockedFunction<typeof useIndicatorById>).mockReturnValue({
      indicator: generateMockFileIndicator(),
      isLoading: false,
    });

    const { getByTestId } = render(
      <TestProvidersComponent>
        <CommentChildren id={id} metadata={metadata} />
      </TestProvidersComponent>
    );
    expect(getByTestId(INDICATOR_NAME_TEST_ID)).toHaveTextContent(metadata.indicatorName);
    expect(getByTestId(INDICATOR_FEED_NAME_TEST_ID)).toHaveTextContent(metadata.indicatorFeedName);
    expect(getByTestId(INDICATOR_TYPE_TEST_ID)).toHaveTextContent(metadata.indicatorType);
  });

  it('should show loading', () => {
    const id: string = 'abc123';
    const metadata: IndicatorAttachmentMetadata = {
      indicatorName: 'indicatorName',
      indicatorFeedName: 'indicatorFeedName',
      indicatorType: 'indicatorType',
    };

    (useIndicatorById as jest.MockedFunction<typeof useIndicatorById>).mockReturnValue({
      indicator: {} as Indicator,
      isLoading: true,
    });

    const { getByTestId } = render(
      <TestProvidersComponent>
        <CommentChildren id={id} metadata={metadata} />
      </TestProvidersComponent>
    );
    expect(getByTestId(LOADING_LOGO_TEST_ID)).toBeInTheDocument();
  });

  it('should open the legacy expandable flyout when the new flyout is disabled', () => {
    const id: string = 'abc123';
    const metadata: IndicatorAttachmentMetadata = {
      indicatorName: 'indicatorName',
      indicatorFeedName: 'indicatorFeedName',
      indicatorType: 'indicatorType',
    };
    const indicator = generateMockFileIndicator();

    (useIndicatorById as jest.MockedFunction<typeof useIndicatorById>).mockReturnValue({
      indicator,
      isLoading: false,
    });

    const { getByTestId } = render(
      <TestProvidersComponent>
        <CommentChildren id={id} metadata={metadata} />
      </TestProvidersComponent>
    );

    fireEvent.click(getByTestId(INDICATOR_NAME_TEST_ID));

    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: 'ioc-details-right',
        params: {
          id: indicator._id,
        },
      },
    });
    expect(flyoutApi.openIocFlyout).not.toHaveBeenCalled();
  });

  it('should open the new IOC flyout when the new flyout is enabled and the indicator is defined', () => {
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

    const id: string = 'abc123';
    const metadata: IndicatorAttachmentMetadata = {
      indicatorName: 'indicatorName',
      indicatorFeedName: 'indicatorFeedName',
      indicatorType: 'indicatorType',
    };
    const indicator = generateMockFileIndicator();

    (useIndicatorById as jest.MockedFunction<typeof useIndicatorById>).mockReturnValue({
      indicator,
      isLoading: false,
    });

    const { getByTestId } = render(
      <TestProvidersComponent>
        <CommentChildren id={id} metadata={metadata} />
      </TestProvidersComponent>
    );

    fireEvent.click(getByTestId(INDICATOR_NAME_TEST_ID));

    expect(flyoutApi.openIocFlyout).toHaveBeenCalledWith({ indicator });
    expect(mockOpenFlyout).not.toHaveBeenCalled();
  });
});
