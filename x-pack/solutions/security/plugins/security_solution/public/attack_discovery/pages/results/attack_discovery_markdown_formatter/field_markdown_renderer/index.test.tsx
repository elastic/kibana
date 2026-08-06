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
import { DEFAULT_ALERTS_INDEX } from '../../../../../../common/constants';

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

  describe('alert-id chip', () => {
    const ALERTS_INDEX_PATTERN = `${DEFAULT_ALERTS_INDEX}-*`;
    const alertId = 'test-alert-id-abc123';

    it('renders an alertIdButton when the field is _id and the value is in alertIds', () => {
      render(
        <TestProviders>
          <MarkdownFormatterContext.Provider value={{ disableActions: false, alertIds: [alertId] }}>
            <FieldMarkdownRenderer icon="warning" name="_id" operator={':'} value={alertId} />
          </MarkdownFormatterContext.Provider>
        </TestProviders>
      );

      expect(screen.getByTestId('alertIdButton')).toBeInTheDocument();
      expect(screen.queryByTestId('entityButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('disabledActionsBadge')).not.toBeInTheDocument();
    });

    it('renders an alertIdButton for kibana.alert.uuid when the value is in alertIds', () => {
      render(
        <TestProviders>
          <MarkdownFormatterContext.Provider value={{ disableActions: false, alertIds: [alertId] }}>
            <FieldMarkdownRenderer
              icon="warning"
              name="kibana.alert.uuid"
              operator={':'}
              value={alertId}
            />
          </MarkdownFormatterContext.Provider>
        </TestProviders>
      );

      expect(screen.getByTestId('alertIdButton')).toBeInTheDocument();
    });

    it('does NOT render an alertIdButton when the value is not in alertIds', () => {
      render(
        <TestProviders>
          <MarkdownFormatterContext.Provider
            value={{ disableActions: false, alertIds: ['some-other-alert-id'] }}
          >
            <FieldMarkdownRenderer icon="warning" name="_id" operator={':'} value={alertId} />
          </MarkdownFormatterContext.Provider>
        </TestProviders>
      );

      expect(screen.queryByTestId('alertIdButton')).not.toBeInTheDocument();
    });

    it('does NOT render an alertIdButton when alertIds is empty', () => {
      render(
        <TestProviders>
          <MarkdownFormatterContext.Provider value={{ disableActions: false, alertIds: [] }}>
            <FieldMarkdownRenderer icon="warning" name="_id" operator={':'} value={alertId} />
          </MarkdownFormatterContext.Provider>
        </TestProviders>
      );

      expect(screen.queryByTestId('alertIdButton')).not.toBeInTheDocument();
    });

    it('does NOT render an alertIdButton when disableActions is true', () => {
      render(
        <TestProviders>
          <MarkdownFormatterContext.Provider value={{ disableActions: true, alertIds: [alertId] }}>
            <FieldMarkdownRenderer icon="warning" name="_id" operator={':'} value={alertId} />
          </MarkdownFormatterContext.Provider>
        </TestProviders>
      );

      expect(screen.queryByTestId('alertIdButton')).not.toBeInTheDocument();
      expect(screen.getByTestId('disabledActionsBadge')).toBeInTheDocument();
    });

    it('calls openFlyout (legacy) when alertIdButton is clicked with new flyout disabled', () => {
      const mockOpenFlyout = jest.fn();
      mockUseExpandableFlyoutApi.mockReturnValue({
        ...createExpandableFlyoutApiMock(),
        openFlyout: mockOpenFlyout,
        openRightPanel: mockOpenRightPanel,
      });

      render(
        <TestProviders>
          <MarkdownFormatterContext.Provider
            value={{ disableActions: false, alertIds: [alertId], scopeId: 'test-scope' }}
          >
            <FieldMarkdownRenderer icon="warning" name="_id" operator={':'} value={alertId} />
          </MarkdownFormatterContext.Provider>
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('alertIdButton'));

      expect(mockOpenFlyout).toHaveBeenCalledTimes(1);
      expect(mockOpenFlyout).toHaveBeenCalledWith({
        right: {
          id: expect.any(String),
          params: { id: alertId, indexName: ALERTS_INDEX_PATTERN, scopeId: 'test-scope' },
        },
      });
      expect(flyoutApi.openDocumentFlyoutFromPattern).not.toHaveBeenCalled();
    });

    it('calls openDocumentFlyoutFromPattern (new flyout) when alertIdButton is clicked', async () => {
      jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

      render(
        <TestProviders>
          <MarkdownFormatterContext.Provider value={{ disableActions: false, alertIds: [alertId] }}>
            <FieldMarkdownRenderer icon="warning" name="_id" operator={':'} value={alertId} />
          </MarkdownFormatterContext.Provider>
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('alertIdButton'));

      await waitFor(() => {
        expect(flyoutApi.openDocumentFlyoutFromPattern).toHaveBeenCalledTimes(1);
        expect(flyoutApi.openDocumentFlyoutFromPattern).toHaveBeenCalledWith(
          expect.objectContaining({
            documentId: alertId,
            indexName: ALERTS_INDEX_PATTERN,
          })
        );
        expect(mockOpenRightPanel).not.toHaveBeenCalled();
      });
    });
  });
});
