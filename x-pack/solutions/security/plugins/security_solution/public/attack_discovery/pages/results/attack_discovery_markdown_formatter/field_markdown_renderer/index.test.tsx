/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../common/mock';
import { ALERTS_INDEX_PATTERN, FieldMarkdownRenderer } from '.';
import { MarkdownFormatterContext } from '../context';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../../flyout_v2/use_flyout_api.mock';

jest.mock('../../../../../flyout_v2/use_flyout_api');

describe('FieldMarkdownRenderer', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;
  const mockUseFlyoutApi = useFlyoutApi as jest.MockedFunction<typeof useFlyoutApi>;

  beforeEach(() => {
    jest.clearAllMocks();

    flyoutApi = createFlyoutApiMock();
    mockUseFlyoutApi.mockReturnValue(flyoutApi);
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

  it('opens the entity flyout API when the entity button is clicked', async () => {
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

  it('does NOT use the Security flyout APIs when disableActions is true', () => {
    render(
      <TestProviders>
        <MarkdownFormatterContext.Provider value={{ disableActions: true }}>
          <FieldMarkdownRenderer icon="storage" name="host.name" operator={':'} value="srv-1" />
        </MarkdownFormatterContext.Provider>
      </TestProviders>
    );

    expect(mockUseFlyoutApi).not.toHaveBeenCalled();
  });

  it('wraps disabled chip labels when wrapFieldValues is true', () => {
    render(
      <TestProviders>
        <MarkdownFormatterContext.Provider value={{ disableActions: true, wrapFieldValues: true }}>
          <FieldMarkdownRenderer icon="storage" name="host.name" operator={':'} value="srv-1" />
        </MarkdownFormatterContext.Provider>
      </TestProviders>
    );

    expect(screen.getByTestId('disabledChipLabel')).toHaveStyleRule('white-space', 'normal');
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
    // Note: JSDOM always reports scrollWidth === clientWidth === 0, so isValueTruncated is
    // always false in tests. Tooltip content differences (field name vs "field: value") are
    // not covered here; they require a real browser layout engine to observe.
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

    it('calls openDocumentFlyoutFromPattern when alertIdButton is clicked', async () => {
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
      });
    });
  });
});
