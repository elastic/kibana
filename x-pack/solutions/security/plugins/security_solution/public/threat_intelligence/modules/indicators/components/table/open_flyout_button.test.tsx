/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { OpenIndicatorFlyoutButton } from './open_flyout_button';
import { generateMockIndicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { TestProvidersComponent } from '../../../../mocks/test_providers';
import { BUTTON_TEST_ID } from './test_ids';
import { IOCRightPanelKey } from '../../../../../flyout/ioc_details/constants/panel_keys';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../../flyout_v2/use_flyout_api.mock';
import { useIsNewFlyoutEnabled } from '../../../../../common/hooks/use_is_new_flyout_enabled';

const mockOpenFlyout = jest.fn();

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: mockOpenFlyout }),
}));

jest.mock('../../../../../flyout_v2/use_flyout_api');
jest.mock('../../../../../common/hooks/use_is_new_flyout_enabled');

const mockIndicator = generateMockIndicator();

describe('<OpenIndicatorFlyoutButton />', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
  });

  it('should render expand button', () => {
    const { getByTestId } = render(
      <TestProvidersComponent>
        <OpenIndicatorFlyoutButton indicator={mockIndicator} />
      </TestProvidersComponent>
    );

    expect(getByTestId(BUTTON_TEST_ID).innerHTML).toContain('maximize');
  });

  it('should open the legacy expandable flyout when the new flyout is disabled', () => {
    const { getByTestId } = render(
      <TestProvidersComponent>
        <OpenIndicatorFlyoutButton indicator={mockIndicator} />
      </TestProvidersComponent>
    );

    fireEvent.click(getByTestId(BUTTON_TEST_ID));

    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: IOCRightPanelKey,
        params: {
          id: mockIndicator._id,
        },
      },
    });
    expect(flyoutApi.openIocFlyout).not.toHaveBeenCalled();
  });

  it('should open the new IOC flyout when the new flyout is enabled', () => {
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

    const { getByTestId } = render(
      <TestProvidersComponent>
        <OpenIndicatorFlyoutButton indicator={mockIndicator} />
      </TestProvidersComponent>
    );

    fireEvent.click(getByTestId(BUTTON_TEST_ID));

    expect(flyoutApi.openIocFlyout).toHaveBeenCalledWith({ indicator: mockIndicator });
    expect(mockOpenFlyout).not.toHaveBeenCalled();
  });
});
