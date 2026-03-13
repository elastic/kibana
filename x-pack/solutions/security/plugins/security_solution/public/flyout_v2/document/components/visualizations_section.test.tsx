/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import {
  VISUALIZATION_SECTION_TEST_ID,
  VISUALIZATION_SECTION_TITLE,
  VisualizationsSection,
} from './visualizations_section';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { EXPANDABLE_PANEL_CONTENT_TEST_ID } from '../../shared/components/test_ids';
import { ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { useKibana } from '../../../common/lib/kibana';
import { useIsAnalyzerEnabled } from '../../../detections/hooks/use_is_analyzer_enabled';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

jest.mock('../../shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));
jest.mock('../../../common/lib/kibana');
jest.mock('../../shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../../detections/hooks/use_is_analyzer_enabled', () => ({
  useIsAnalyzerEnabled: jest.fn(),
}));
jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));
jest.mock('../../../sourcerer/containers', () => ({
  useSourcererDataView: jest.fn(() => ({ selectedPatterns: [] })),
}));
jest.mock('../../../data_view_manager/hooks/use_selected_patterns', () => ({
  useSelectedPatterns: jest.fn(() => []),
}));
jest.mock('../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn(() => ({
    status: 'ready',
    dataView: {
      hasMatchedIndices: () => true,
    },
  })),
}));

jest.mock('./analyzer_preview', () => ({
  AnalyzerPreview: () => <div data-test-subj="analyzerPreviewMock" />,
}));

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
  const mockUseExpandSection = jest.mocked(useExpandSection);
  const mockUseKibana = jest.mocked(useKibana);
  const mockIsAnalyzerEnabled = jest.mocked(useIsAnalyzerEnabled);
  const mockUseIsExperimentalFeatureEnabled = jest.mocked(useIsExperimentalFeatureEnabled);

  const openSystemFlyout = jest.fn();
  const renderCellActions = jest.fn();
  const store = createStore(() => ({}));
  const history = createMemoryHistory();

  const renderVisualizationsSection = () =>
    render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <Router history={history}>
            <VisualizationsSection hit={mockHit} renderCellActions={renderCellActions} />
          </Router>
        </Provider>
      </IntlProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        overlays: {
          openSystemFlyout,
        },
        uiSettings: {
          get: jest.fn().mockReturnValue(true),
        },
        serverless: undefined,
      },
    } as unknown as ReturnType<typeof useKibana>);
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
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

    expect(
      getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
  });
});
