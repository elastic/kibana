/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { GraphPreviewContainer } from './graph_preview_container';
import { GRAPH_PREVIEW_TEST_ID } from './test_ids';
import { useGraphPreview } from '../../shared/hooks/use_graph_preview';
import {
  EXPANDABLE_PANEL_CONTENT_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../shared/components/test_ids';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

const mockUseUiSetting = jest.fn().mockReturnValue([true]);
jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useUiSetting$: () => mockUseUiSetting(),
  };
});

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

jest.mock('../../shared/hooks/use_graph_preview');
jest.mock('@kbn/cloud-security-posture-graph/src/hooks', () => ({
  useFetchGraphData: jest.fn(),
}));
const mockUseFetchGraphData = useFetchGraphData as jest.Mock;

const mockGraph = () => <div data-test-subj={GRAPH_PREVIEW_TEST_ID} />;

jest.mock('@kbn/cloud-security-posture-graph', () => {
  return { Graph: mockGraph };
});

const renderGraphPreview = (context = mockContextValue) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={context}>
        <GraphPreviewContainer />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

const DEFAULT_NODES = [
  {
    id: '1',
    color: 'primary',
    shape: 'ellipse',
  },
];

describe('<GraphPreviewContainer />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
  });

  it('should render component and link in header', async () => {
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { nodes: DEFAULT_NODES, edges: [] },
    });

    const timestamp = new Date().toISOString();

    (useGraphPreview as jest.Mock).mockReturnValue({
      timestamp,
      eventIds: [],
      hasGraphRepresentation: true,
    });

    const { getByTestId, queryByTestId, findByTestId } = renderGraphPreview();

    // Using findByTestId to wait for the component to be rendered because it is a lazy loaded component
    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(mockUseFetchGraphData).toHaveBeenCalled();
    expect(mockUseFetchGraphData.mock.calls[0][0]).toEqual({
      req: {
        query: {
          eventIds: [],
          start: `${timestamp}||-30m`,
          end: `${timestamp}||+30m`,
        },
      },
      options: {
        enabled: true,
        refetchOnWindowFocus: false,
      },
    });
  });

  it('should render component and without link in header in preview panel', async () => {
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { nodes: DEFAULT_NODES, edges: [] },
    });

    const timestamp = new Date().toISOString();

    (useGraphPreview as jest.Mock).mockReturnValue({
      timestamp,
      eventIds: [],
      hasGraphRepresentation: true,
    });

    const { getByTestId, queryByTestId, findByTestId } = renderGraphPreview({
      ...mockContextValue,
      isPreviewMode: true,
    });

    // Using findByTestId to wait for the component to be rendered because it is a lazy loaded component
    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(mockUseFetchGraphData).toHaveBeenCalled();
    expect(mockUseFetchGraphData.mock.calls[0][0]).toEqual({
      req: {
        query: {
          eventIds: [],
          start: `${timestamp}||-30m`,
          end: `${timestamp}||+30m`,
        },
      },
      options: {
        enabled: true,
        refetchOnWindowFocus: false,
      },
    });
  });

  it('should render component and without link in header in rule preview', async () => {
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { nodes: DEFAULT_NODES, edges: [] },
    });

    const timestamp = new Date().toISOString();

    (useGraphPreview as jest.Mock).mockReturnValue({
      timestamp,
      eventIds: [],
      hasGraphRepresentation: true,
    });

    const { getByTestId, queryByTestId, findByTestId } = renderGraphPreview({
      ...mockContextValue,
      isPreview: true,
    });

    // Using findByTestId to wait for the component to be rendered because it is a lazy loaded component
    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(mockUseFetchGraphData).toHaveBeenCalled();
    expect(mockUseFetchGraphData.mock.calls[0][0]).toEqual({
      req: {
        query: {
          eventIds: [],
          start: `${timestamp}||-30m`,
          end: `${timestamp}||+30m`,
        },
      },
      options: {
        enabled: true,
        refetchOnWindowFocus: false,
      },
    });
  });

  it('should render component and without link in header when expanding flyout feature is disabled', async () => {
    mockUseUiSetting.mockReturnValue([false]);
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { nodes: DEFAULT_NODES, edges: [] },
    });

    const timestamp = new Date().toISOString();

    (useGraphPreview as jest.Mock).mockReturnValue({
      timestamp,
      eventIds: [],
      hasGraphRepresentation: true,
    });

    const { getByTestId, queryByTestId, findByTestId } = renderGraphPreview();

    // Using findByTestId to wait for the component to be rendered because it is a lazy loaded component
    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(mockUseFetchGraphData).toHaveBeenCalled();
    expect(mockUseFetchGraphData.mock.calls[0][0]).toEqual({
      req: {
        query: {
          eventIds: [],
          start: `${timestamp}||-30m`,
          end: `${timestamp}||+30m`,
        },
      },
      options: {
        enabled: true,
        refetchOnWindowFocus: false,
      },
    });
  });

  it('should not render when graph data is not available', async () => {
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      data: undefined,
    });

    const timestamp = new Date().toISOString();

    (useGraphPreview as jest.Mock).mockReturnValue({
      timestamp,
      eventIds: [],
      hasGraphRepresentation: false,
    });

    const { getByTestId, queryByTestId, findByTestId } = renderGraphPreview();

    // Using findByTestId to wait for the component to be rendered because it is a lazy loaded component
    expect(
      await findByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(mockUseFetchGraphData).toHaveBeenCalled();
    expect(mockUseFetchGraphData.mock.calls[0][0]).toEqual({
      req: {
        query: {
          eventIds: [],
          start: `${timestamp}||-30m`,
          end: `${timestamp}||+30m`,
        },
      },
      options: {
        enabled: false,
        refetchOnWindowFocus: false,
      },
    });
  });
});
