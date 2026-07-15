/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../common/mock';
import { FieldMarkdownRenderer } from '.';
import { MarkdownFormatterContext } from '../context';
import { createExpandableFlyoutApiMock } from '../../../../../common/mock/expandable_flyout';
import { useIsNewFlyoutEnabled } from '../../../../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../../flyout_v2/use_flyout_api.mock';

jest.mock('@kbn/expandable-flyout');
jest.mock('../../../../../flyout_v2/use_flyout_api');
jest.mock('../../../../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: jest.fn().mockReturnValue(false),
}));

describe('FieldMarkdownRenderer', () => {
  const mockOpenRightPanel = jest.fn();
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;
  const mockUseExpandableFlyoutApi = useExpandableFlyoutApi as jest.MockedFunction<
    typeof useExpandableFlyoutApi
  >;
  const mockUseFlyoutApi = useFlyoutApi as jest.MockedFunction<typeof useFlyoutApi>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseExpandableFlyoutApi.mockReturnValue({
      ...createExpandableFlyoutApiMock(),
      openRightPanel: mockOpenRightPanel,
    });
    flyoutApi = createFlyoutApiMock();
    mockUseFlyoutApi.mockReturnValue(flyoutApi);
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
  });

  it('renders the field value', () => {
    const icon = '';
    const name = 'some.field';
    const value = 'some.value';

    render(
      <TestProviders>
        <MarkdownFormatterContext.Provider value={{ disableActions: false }}>
          <FieldMarkdownRenderer icon={icon} name={name} operator={':'} value={value} />
        </MarkdownFormatterContext.Provider>
      </TestProviders>
    );

    const fieldValue = screen.getByText(value);

    expect(fieldValue).toBeInTheDocument();
  });

  it('opens the right panel when the entity button is clicked', () => {
    const icon = 'user';
    const name = 'user.name';
    const value = 'some.user';

    render(
      <TestProviders>
        <MarkdownFormatterContext.Provider value={{ disableActions: false }}>
          <FieldMarkdownRenderer icon={icon} name={name} operator={':'} value={value} />
        </MarkdownFormatterContext.Provider>
      </TestProviders>
    );

    const entityButton = screen.getByTestId('entityButton');

    fireEvent.click(entityButton);

    expect(mockOpenRightPanel).toHaveBeenCalledTimes(1);
    expect(flyoutApi.openUserFlyout).not.toHaveBeenCalled();
    expect(flyoutApi.openHostFlyout).not.toHaveBeenCalled();
  });

  it('opens the entity flyout API when the new flyout is enabled', async () => {
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

    const icon = 'user';
    const name = 'user.name';
    const value = 'some.user';

    render(
      <TestProviders>
        <MarkdownFormatterContext.Provider value={{ disableActions: false }}>
          <FieldMarkdownRenderer icon={icon} name={name} operator={':'} value={value} />
        </MarkdownFormatterContext.Provider>
      </TestProviders>
    );

    const entityButton = screen.getByTestId('entityButton');

    fireEvent.click(entityButton);

    await waitFor(() => {
      expect(flyoutApi.openUserFlyout).toHaveBeenCalledTimes(1);
      expect(flyoutApi.openHostFlyout).not.toHaveBeenCalled();
      expect(mockOpenRightPanel).not.toHaveBeenCalled();
    });
  });

  it('does NOT render the entity button when flyoutPanelProps is null', () => {
    const icon = '';
    const name = 'some.field';
    const value = 'some.value';

    render(
      <TestProviders>
        <MarkdownFormatterContext.Provider value={{ disableActions: false }}>
          <FieldMarkdownRenderer icon={icon} name={name} operator={':'} value={value} />
        </MarkdownFormatterContext.Provider>
      </TestProviders>
    );

    const entityButton = screen.queryByTestId('entityButton');

    expect(entityButton).not.toBeInTheDocument();
  });

  it('renders disabled actions badge when disableActions is true', () => {
    const icon = 'user';
    const name = 'user.name';
    const value = 'some.user';

    render(
      <TestProviders>
        <MarkdownFormatterContext.Provider value={{ disableActions: true }}>
          <FieldMarkdownRenderer icon={icon} name={name} operator={':'} value={value} />
        </MarkdownFormatterContext.Provider>
      </TestProviders>
    );

    const disabledActionsBadge = screen.getByTestId('disabledActionsBadge');

    expect(disabledActionsBadge).toBeInTheDocument();
  });

  it('renders the field tooltip on the badge when disableActions is true', () => {
    const icon = 'user';
    const name = 'user.name';
    const value = 'some.user';

    render(
      <TestProviders>
        <MarkdownFormatterContext.Provider value={{ disableActions: true }}>
          <FieldMarkdownRenderer icon={icon} name={name} operator={':'} value={value} />
        </MarkdownFormatterContext.Provider>
      </TestProviders>
    );

    const disabledActionsBadge = screen.getByTestId('disabledActionsBadge');

    expect(disabledActionsBadge.closest('.euiToolTipAnchor')).toBeInTheDocument();
    expect(screen.queryByTestId(`render-content-${name}`)).not.toBeInTheDocument();
  });

  it('renders the field tooltip via cell actions when disableActions is false', () => {
    const icon = '';
    const name = 'process.name';
    const value = 'explorer.exe';

    render(
      <TestProviders>
        <MarkdownFormatterContext.Provider value={{ disableActions: false }}>
          <FieldMarkdownRenderer icon={icon} name={name} operator={':'} value={value} />
        </MarkdownFormatterContext.Provider>
      </TestProviders>
    );

    const cellActionsContent = screen.getByTestId(`render-content-${name}`);

    expect(screen.queryByTestId('fieldMarkdownRendererToolTip')).not.toBeInTheDocument();
    expect(cellActionsContent.querySelector('.euiToolTipAnchor')).toBeInTheDocument();
    expect(screen.queryByTestId('disabledActionsBadge')).not.toBeInTheDocument();
    expect(screen.getByTestId('fieldMarkdownRendererInlineWrapper')).toBeInTheDocument();
  });
});
