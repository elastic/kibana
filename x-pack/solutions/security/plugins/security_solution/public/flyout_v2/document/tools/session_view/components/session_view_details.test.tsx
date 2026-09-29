/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Provider } from 'react-redux-v7';
import { createStore } from 'redux-v4';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import type { Process, ProcessEvent } from '@kbn/session-view-plugin/common';
import { SessionViewDetails } from './session_view_details';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { createFlyoutApiMock } from '../../../../use_flyout_api.mock';

let lastOnJumpToEvent: ((event: ProcessEvent) => void) | undefined;

vi.mock('@elastic/eui', async () => {
  const actual = await vi.importActual('@elastic/eui');
  return {
    ...actual,
    EuiTabbedContent: ({ tabs }: { tabs: Array<{ content: React.ReactNode }> }) => (
      <div>
        {tabs.map((tab, index) => (
          <div key={index}>{tab.content}</div>
        ))}
      </div>
    ),
  };
});

vi.mock('../../../../use_flyout_api');
vi.mock('./process_tab', () => {
  const mocked = {
    ProcessTab: () => <div data-test-subj="processTabMock" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./metadata_tab', () => {
  const mocked = {
    MetadataTab: () => <div data-test-subj="metadataTabMock" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./alerts_tab', () => {
  const mocked = {
    AlertsTab: (props: { onJumpToEvent: (event: ProcessEvent) => void }) => {
      lastOnJumpToEvent = props.onJumpToEvent;
      return <div data-test-subj="alertsTabMock" />;
    },
  };
  return { ...mocked, default: mocked };
});

describe('SessionViewDetails', () => {
  const mockUseFlyoutApi = vi.mocked(useFlyoutApi);
  const flyoutApi = createFlyoutApiMock();
  const store = createStore(() => ({}));
  const history = createMemoryHistory();

  const renderComponent = (onJumpToEvent: (event: ProcessEvent) => void) =>
    render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <Router history={history}>
            <SessionViewDetails
              selectedProcess={{} as Process}
              index="test-index"
              sessionEntityId="session-entity-id"
              sessionStartTime="2023-01-01T00:00:00.000Z"
              investigatedAlertId="alert-id"
              renderCellActions={vi.fn()}
              onJumpToEvent={onJumpToEvent}
              onAlertUpdated={vi.fn()}
            />
          </Router>
        </Provider>
      </IntlProvider>
    );

  beforeEach(() => {
    vi.clearAllMocks();
    lastOnJumpToEvent = undefined;
    mockUseFlyoutApi.mockReturnValue(flyoutApi);
  });

  it('delegates jump to event handling to the parent', () => {
    const onJumpToEvent = vi.fn();

    renderComponent(onJumpToEvent);

    const event = {
      process: { entity_id: 'process-entity-id' },
      '@timestamp': '2023-01-02T00:00:00.000Z',
    } as ProcessEvent;

    lastOnJumpToEvent?.(event);

    expect(onJumpToEvent).toHaveBeenCalledWith(event);
    expect(flyoutApi.openDocumentFlyoutFromIndexAsChild).not.toHaveBeenCalled();
  });
});
