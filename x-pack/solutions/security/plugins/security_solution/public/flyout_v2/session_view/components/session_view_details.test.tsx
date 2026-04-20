/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import type { Process, ProcessEvent } from '@kbn/session-view-plugin/common';
import { SessionViewDetails } from './session_view_details';
import { useKibana } from '../../../common/lib/kibana';

let lastOnJumpToEvent: ((event: ProcessEvent) => void) | undefined;

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
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

jest.mock('../../../common/lib/kibana');
jest.mock('./process_tab', () => ({
  ProcessTab: () => <div data-test-subj="processTabMock" />,
}));
jest.mock('./metadata_tab', () => ({
  MetadataTab: () => <div data-test-subj="metadataTabMock" />,
}));
jest.mock('./alerts_tab', () => ({
  AlertsTab: (props: { onJumpToEvent: (event: ProcessEvent) => void }) => {
    lastOnJumpToEvent = props.onJumpToEvent;
    return <div data-test-subj="alertsTabMock" />;
  },
}));

describe('SessionViewDetails', () => {
  const mockUseKibana = jest.mocked(useKibana);
  const openSystemFlyout = jest.fn();
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
              renderCellActions={jest.fn()}
              onJumpToEvent={onJumpToEvent}
              onAlertUpdated={jest.fn()}
            />
          </Router>
        </Provider>
      </IntlProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    lastOnJumpToEvent = undefined;
    mockUseKibana.mockReturnValue({
      services: {
        overlays: {
          openSystemFlyout,
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('delegates jump to event handling to the parent', () => {
    const onJumpToEvent = jest.fn();

    renderComponent(onJumpToEvent);

    const event = {
      process: { entity_id: 'process-entity-id' },
      '@timestamp': '2023-01-02T00:00:00.000Z',
    } as ProcessEvent;

    lastOnJumpToEvent?.(event);

    expect(onJumpToEvent).toHaveBeenCalledWith(event);
    expect(openSystemFlyout).not.toHaveBeenCalled();
  });
});
