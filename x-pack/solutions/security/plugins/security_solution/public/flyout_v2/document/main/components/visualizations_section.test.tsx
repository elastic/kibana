/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { act, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { Provider } from 'react-redux-v7';
import { createStore } from 'redux-v4';
import { VISUALIZATION_SECTION_TEST_ID, VisualizationsSection } from './visualizations_section';
import { VISUALIZATION_SECTION_TITLE } from '../../../shared/constants/flyout_titles';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { EXPANDABLE_PANEL_CONTENT_TEST_ID } from '../../../shared/components/test_ids';
import { ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { useIsAnalyzerEnabled } from '../../../../detections/hooks/use_is_analyzer_enabled';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { documentFlyoutHistoryKey } from '../../../shared/constants/flyout_history';

vi.mock('../../../shared/hooks/use_expand_section', () => {
  const mocked = {
    useExpandSection: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../common/lib/kibana');
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

vi.mock('../../../../detections/hooks/use_is_analyzer_enabled', () => {
  const mocked = {
    useIsAnalyzerEnabled: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../data_view_manager/hooks/use_data_view', () => {
  const mocked = {
    useDataView: vi.fn(() => ({
      status: 'ready',
      dataView: {
        hasMatchedIndices: () => true,
      },
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./analyzer_preview', () => {
  const mocked = {
    AnalyzerPreview: () => <div data-test-subj="analyzerPreviewMock" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./session_preview_container', () => {
  const mocked = {
    SessionPreviewContainer: ({ onShowSessionView }: { onShowSessionView: () => void }) => (
      <button
        type="button"
        data-test-subj="sessionPreviewContainerMock"
        onClick={onShowSessionView}
      >
        {'SessionPreview'}
      </button>
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./graph_preview_container', () => {
  const mocked = {
    GraphPreviewContainer: ({ onShowGraph }: { onShowGraph: () => void }) => (
      <button type="button" data-test-subj="graphPreviewContainerMock" onClick={onShowGraph}>
        {'GraphPreview'}
      </button>
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../tools/graph', () => {
  const mocked = {
    GraphDetails: () => <div data-test-subj="graphDetailsMock" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_graph_preview', () => {
  const mocked = {
    useGraphPreview: vi.fn(() => ({ hasGraphData: true })),
  };
  return { ...mocked, default: mocked };
});

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const mockHit = createMockHit({
  'event.kind': 'signal',
});

describe('VisualizationsSection', () => {
  const mockUseExpandSection = vi.mocked(useExpandSection);
  const mockUseKibana = vi.mocked(useKibana);
  const mockUseIsInSecurityApp = vi.mocked(useIsInSecurityApp);
  const mockIsAnalyzerEnabled = vi.mocked(useIsAnalyzerEnabled);

  const openSystemFlyout = vi.fn();
  const renderCellActions = vi.fn();
  const onAlertUpdated = vi.fn();
  const store = createStore(() => ({}));
  const history = createMemoryHistory();

  const renderVisualizationsSection = () =>
    render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <Router history={history}>
            <VisualizationsSection
              hit={mockHit}
              renderCellActions={renderCellActions}
              onAlertUpdated={onAlertUpdated}
            />
          </Router>
        </Provider>
      </IntlProvider>
    );

  beforeEach(() => {
    vi.clearAllMocks();
    openSystemFlyout.mockReturnValue({ onClose: Promise.resolve(), close: vi.fn() });
    mockUseKibana.mockReturnValue({
      services: {
        overlays: {
          openSystemFlyout,
        },
        uiSettings: {
          get: vi.fn().mockReturnValue(true),
        },
        serverless: undefined,
        storage: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
        telemetry: { reportEvent: vi.fn() },
      },
    } as unknown as ReturnType<typeof useKibana>);
    mockUseIsInSecurityApp.mockReturnValue(true);
    mockIsAnalyzerEnabled.mockReturnValue(true);
  });

  it('renders the Visualizations expandable section', () => {
    mockUseExpandSection.mockReturnValue(true);

    const { getByTestId } = renderVisualizationsSection();

    expect(getByTestId(`${VISUALIZATION_SECTION_TEST_ID}Header`)).toHaveTextContent(
      VISUALIZATION_SECTION_TITLE
    );
  });

  it('renders the component collapsed if value is false in local storage', async () => {
    mockUseExpandSection.mockReturnValue(false);

    const { getByTestId } = renderVisualizationsSection();

    await act(async () => {
      expect(getByTestId(`${VISUALIZATION_SECTION_TEST_ID}Content`)).not.toBeVisible();
    });
  });

  it('renders the component expanded if value is true in local storage', async () => {
    mockUseExpandSection.mockReturnValue(true);

    const { getByTestId } = renderVisualizationsSection();

    await act(async () => {
      expect(getByTestId(`${VISUALIZATION_SECTION_TEST_ID}Content`)).toBeVisible();
    });

    expect(getByTestId('sessionPreviewContainerMock')).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(getByTestId('graphPreviewContainerMock')).toBeInTheDocument();
  });

  it('uses Security history key when opening session flyout in Security app', () => {
    mockUseExpandSection.mockReturnValue(true);
    mockUseIsInSecurityApp.mockReturnValue(true);

    const { getByTestId } = renderVisualizationsSection();
    act(() => getByTestId('sessionPreviewContainerMock').click());

    expect(openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: documentFlyoutHistoryKey,
        session: 'start',
      })
    );
  });

  it('uses Discover history key when opening session flyout outside Security app', () => {
    mockUseExpandSection.mockReturnValue(true);
    mockUseIsInSecurityApp.mockReturnValue(false);

    const { getByTestId } = renderVisualizationsSection();
    act(() => getByTestId('sessionPreviewContainerMock').click());

    expect(openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY,
        session: 'start',
      })
    );
  });

  it('uses Security history key when opening graph flyout in Security app', () => {
    mockUseExpandSection.mockReturnValue(true);
    mockUseIsInSecurityApp.mockReturnValue(true);

    const { getByTestId } = renderVisualizationsSection();
    act(() => getByTestId('graphPreviewContainerMock').click());

    expect(openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: documentFlyoutHistoryKey,
        session: 'start',
      })
    );
  });

  it('uses Discover history key when opening graph flyout outside Security app', () => {
    mockUseExpandSection.mockReturnValue(true);
    mockUseIsInSecurityApp.mockReturnValue(false);

    const { getByTestId } = renderVisualizationsSection();
    act(() => getByTestId('graphPreviewContainerMock').click());

    expect(openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY,
        session: 'start',
      })
    );
  });
});
