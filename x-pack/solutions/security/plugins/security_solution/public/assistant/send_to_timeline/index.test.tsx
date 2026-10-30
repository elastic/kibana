/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SendToTimelineButton } from '.';
import type { DataProvider } from '../../timelines/components/timeline/data_providers/data_provider';
import { TimelineId, TimelineTabs } from '../../../common/types/timeline';
import {
  applyKqlFilterQuery,
  setActiveTabTimeline,
  showTimeline,
} from '../../timelines/store/actions';
import { useShowTimeline } from '../../common/utils/timeline/use_show_timeline';
import { useKibana } from '../../common/lib/kibana';

const mockDispatch = jest.fn();
const mockShowAssistantOverlay = jest.fn();

jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useDispatch: () => mockDispatch,
}));
jest.mock('@kbn/elastic-assistant', () => ({
  ...jest.requireActual('@kbn/elastic-assistant'),
  useAssistantContext: () => ({ showAssistantOverlay: mockShowAssistantOverlay }),
}));
jest.mock('../../common/utils/timeline/use_show_timeline');
jest.mock('../../common/lib/kibana');
jest.mock('../../common/components/discover_in_timeline/use_discover_in_timeline_context', () => ({
  useDiscoverInTimelineContext: () => ({
    discoverStateContainer: { current: undefined },
    defaultDiscoverAppState: {},
  }),
}));
jest.mock('../../timelines/components/timeline/tabs/esql/use_discover_state', () => ({
  useDiscoverState: () => ({ setDiscoverAppState: jest.fn() }),
}));
jest.mock('../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: () => ({ dataView: { id: 'timeline-data-view' } }),
}));
jest.mock('../../data_view_manager/hooks/use_signal_index_name', () => ({
  useSignalIndexName: () => '.alerts-security.alerts-default',
}));
jest.mock('../../data_view_manager/hooks/use_security_default_patterns', () => ({
  useSecurityDefaultPatterns: () => ({ id: 'security-solution-default', indexPatterns: [] }),
}));
jest.mock('../../data_view_manager/hooks/use_select_data_view', () => ({
  useSelectDataView: () => jest.fn(),
}));

const KQL_QUERY = 'host.risk.keyword: "high"';

const kqlDataProviders: DataProvider[] = [
  {
    id: 'assistant-data-provider',
    name: 'Assistant Query from conversation test',
    enabled: true,
    excluded: false,
    kqlQuery: KQL_QUERY,
    queryType: 'kql',
    queryMatch: { field: 'host.name', value: 'test', operator: ':' },
    and: [],
  },
];

const renderButton = () =>
  render(
    <SendToTimelineButton asEmptyButton dataProviders={kqlDataProviders} keepDataView>
      {'Investigate in timeline'}
    </SendToTimelineButton>
  );

describe('SendToTimelineButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: { securitySolutionTimeline: { read: true, crud: true } },
        },
      },
    });
  });

  it('is disabled when the timeline bottom bar is not shown on the current page', () => {
    (useShowTimeline as jest.Mock).mockReturnValue([false]);

    renderButton();

    expect(screen.getByTestId('sendToTimelineEmptyButton')).toBeDisabled();
  });

  it('opens the timeline with the KQL query when the timeline bottom bar is shown', async () => {
    (useShowTimeline as jest.Mock).mockReturnValue([true]);

    renderButton();

    const button = screen.getByTestId('sendToTimelineEmptyButton');
    expect(button).toBeEnabled();

    await userEvent.click(button);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        applyKqlFilterQuery({
          id: TimelineId.active,
          filterQuery: {
            kuery: { kind: 'kuery', expression: KQL_QUERY },
            serializedQuery: KQL_QUERY,
          },
        })
      );
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      setActiveTabTimeline({ id: TimelineId.active, activeTab: TimelineTabs.query })
    );
    expect(mockDispatch).toHaveBeenCalledWith(showTimeline({ id: TimelineId.active, show: true }));
    expect(mockShowAssistantOverlay).toHaveBeenCalledWith({ showOverlay: false });
  });
});
