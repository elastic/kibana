/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { Provider } from 'react-redux-v7';
import { createStore } from 'redux-v4';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { ResponseSection } from './response_section';
import { ResponseSectionContent } from './response_section_content';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { documentFlyoutHistoryKey } from '../../../shared/constants/flyout_history';

vi.mock('../../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../common/hooks/is_in_security_app', () => {
      const mocked = {
      useIsInSecurityApp: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../shared/components/flyout_provider', () => {
      const mocked = {
      flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./response_section_content', () => {
      const mocked = {
      ResponseSectionContent: vi.fn(
        ({ onShowResponseDetails }: { onShowResponseDetails: () => void }) => (
          <button
            type="button"
            data-test-subj="responseSectionContentMock"
            onClick={onShowResponseDetails}
          >
            {'show'}
          </button>
        )
      ),
    };
      return { ...mocked, default: mocked };
    });

const mockOpenSystemFlyout = vi.fn();
const store = createStore(() => ({}));
const history = createMemoryHistory();

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: { _id: '1', _index: 'test-index', _source: {} },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertMockHit = createMockHit({ 'event.kind': 'signal' });

const renderResponseSection = () =>
  render(
    <Provider store={store}>
      <Router history={history}>
        <ResponseSection hit={alertMockHit} />
      </Router>
    </Provider>
  );

describe('<ResponseSection />', () => {
  const mockUseKibana = vi.mocked(useKibana);
  const mockUseIsInSecurityApp = vi.mocked(useIsInSecurityApp);
  const mockResponseSectionContent = vi.mocked(ResponseSectionContent);

  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenSystemFlyout.mockReturnValue({ onClose: Promise.resolve(), close: vi.fn() });
    mockUseIsInSecurityApp.mockReturnValue(true);
    mockUseKibana.mockReturnValue({
      services: {
        overlays: {
          openSystemFlyout: mockOpenSystemFlyout,
        },
        storage: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
        telemetry: { reportEvent: vi.fn() },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('forwards hit and onShowResponseDetails to ResponseSectionContent', () => {
    renderResponseSection();

    expect(mockResponseSectionContent).toHaveBeenCalledWith(
      expect.objectContaining({
        hit: alertMockHit,
        onShowResponseDetails: expect.any(Function),
      }),
      {}
    );
  });

  it('opens response details in a system flyout when the callback fires', () => {
    const { getByTestId } = renderResponseSection();

    fireEvent.click(getByTestId('responseSectionContentMock'));

    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: documentFlyoutHistoryKey,
        minWidth: expect.any(Number),
        ownFocus: false,
        paddingSize: 'm',
        resizable: true,
        session: 'start',
        size: 'm',
      })
    );
  });

  it('uses the Discover history key when not in Security Solution', () => {
    mockUseIsInSecurityApp.mockReturnValue(false);

    const { getByTestId } = renderResponseSection();

    fireEvent.click(getByTestId('responseSectionContentMock'));

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY,
        session: 'start',
      })
    );
  });
});
