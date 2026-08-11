/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ALERT_RULE_TYPE } from '@kbn/rule-data-utils';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import {
  EVENT_SOURCE_FIELD_NAME,
  LEGACY_EVENT_SOURCE_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import {
  DocumentFlyout,
  JSON_TAB_TEST_ID,
  OVERVIEW_TAB_TEST_ID,
  TABLE_TAB_SOURCE_EVENT_LINK_TEST_ID,
  TABLE_TAB_TEST_ID,
} from '.';
import { ANCESTOR_INDEX } from './constants/field_names';
import { getTimelineEventsDetailsFromRecord } from './utils/get_timeline_events_details_from_record';
import type { OpenFlyoutLinkRenderer } from '../../shared/components/open_flyout_link';
import { TestProviders } from '../../../common/mock';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';

jest.mock('../../../detections/containers/detection_engine/alerts/use_alerts_privileges');
jest.mock('../../../common/hooks/is_in_security_app');
jest.mock('./utils/get_timeline_events_details_from_record', () => ({
  getTimelineEventsDetailsFromRecord: jest.fn(() => []),
}));
// The Table tab is mocked, but it captures the `renderFlyoutLink` prop so the source event link
// behavior (built in DocumentFlyout) can be exercised in isolation.
const mockTableTab = jest.fn(
  (_props: { renderFlyoutLink?: OpenFlyoutLinkRenderer }): JSX.Element => (
    <div data-test-subj="mock-table-tab" />
  )
);
jest.mock('./tabs/table_tab', () => ({
  TableTab: (props: { renderFlyoutLink?: OpenFlyoutLinkRenderer }) => mockTableTab(props),
}));
jest.mock('./tabs/json_tab', () => ({
  JsonTab: () => <div data-test-subj="mock-json-tab" />,
}));
jest.mock('./header', () => ({
  Header: ({
    onAlertUpdated,
    onShowNotes,
  }: {
    onAlertUpdated: () => void;
    onShowNotes: () => void;
  }) => (
    <button
      type="button"
      data-test-subj="mock-header"
      data-has-on-assignees-updated={String(onAlertUpdated != null)}
      onClick={onShowNotes}
    />
  ),
}));
jest.mock('./tabs/overview_tab', () => ({
  OverviewTab: () => <div data-test-subj="mock-overview-tab" />,
}));
jest.mock('./footer', () => ({ Footer: () => <div data-test-subj="mock-footer" /> }));
jest.mock('../../shared/tools/notes', () => ({
  NotesDetails: () => <div data-test-subj="mock-notes-details" />,
}));

const createAlertHit = (extra: DataTableRecord['flattened'] = {}): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened: { 'event.kind': 'signal', ...extra },
    isAnchor: false,
  } as DataTableRecord);

describe('<DocumentFlyout />', () => {
  const startServices = createStartServicesMock();

  beforeEach(() => {
    jest.clearAllMocks();
    (useIsInSecurityApp as jest.Mock).mockReturnValue(true);
  });

  it('renders FlyoutMissingAlertsPrivilege when document is an alert and user lacks alerts read privilege', () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: false, loading: false });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentFlyout
          hit={createAlertHit()}
          onAlertUpdated={jest.fn()}
          renderCellActions={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('noPrivilegesPage')).toBeInTheDocument();
  });

  it('renders loading while alerts privileges are loading for an alert', () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: false, loading: true });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <DocumentFlyout
          hit={createAlertHit()}
          onAlertUpdated={jest.fn()}
          renderCellActions={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('document-overview-loading')).toBeInTheDocument();
    expect(queryByTestId('noPrivilegesPage')).not.toBeInTheDocument();
  });

  it('renders the header, overview tab and footer', () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true, loading: false });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentFlyout
          hit={createAlertHit()}
          renderCellActions={jest.fn()}
          onAlertUpdated={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('mock-header')).toBeInTheDocument();
    expect(getByTestId('mock-overview-tab')).toBeInTheDocument();
    expect(getByTestId('mock-footer')).toBeInTheDocument();
  });

  it('renders Overview, Table and JSON tabs and switches between them in Security Solution', () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true, loading: false });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <DocumentFlyout
          hit={createAlertHit()}
          renderCellActions={jest.fn()}
          onAlertUpdated={jest.fn()}
        />
      </TestProviders>
    );

    // all three tab buttons are present
    expect(getByTestId(OVERVIEW_TAB_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(JSON_TAB_TEST_ID)).toBeInTheDocument();

    // overview is selected by default
    expect(getByTestId('mock-overview-tab')).toBeInTheDocument();

    // switching to the Table tab renders the table content
    fireEvent.click(getByTestId(TABLE_TAB_TEST_ID));
    expect(getByTestId('mock-table-tab')).toBeInTheDocument();
    expect(queryByTestId('mock-overview-tab')).not.toBeInTheDocument();
    expect(queryByTestId('mock-json-tab')).not.toBeInTheDocument();

    // switching to the JSON tab renders the json content
    fireEvent.click(getByTestId(JSON_TAB_TEST_ID));
    expect(getByTestId('mock-json-tab')).toBeInTheDocument();
    expect(queryByTestId('mock-overview-tab')).not.toBeInTheDocument();
    expect(queryByTestId('mock-table-tab')).not.toBeInTheDocument();
  });

  it('does not render the Table and JSON tabs outside Security Solution (e.g. Discover)', () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true, loading: false });
    (useIsInSecurityApp as jest.Mock).mockReturnValue(false);

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <DocumentFlyout
          hit={createAlertHit()}
          renderCellActions={jest.fn()}
          onAlertUpdated={jest.fn()}
        />
      </TestProviders>
    );

    expect(queryByTestId(JSON_TAB_TEST_ID)).not.toBeInTheDocument();
    // the overview content still renders directly
    expect(getByTestId('mock-overview-tab')).toBeInTheDocument();
  });

  it('opens notes in a system flyout when notes action is clicked', () => {
    const openSystemFlyout = jest.fn();
    startServices.overlays = {
      ...startServices.overlays,
      openSystemFlyout,
    };
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true, loading: false });

    const { getByTestId } = render(
      <TestProviders startServices={startServices}>
        <DocumentFlyout
          hit={createAlertHit()}
          renderCellActions={jest.fn()}
          onAlertUpdated={jest.fn()}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('mock-header'));

    expect(openSystemFlyout).toHaveBeenCalledTimes(1);
    expect(openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ownFocus: false,
        resizable: true,
        size: 'm',
      })
    );
  });

  it('passes assignee updates callback to the header', () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true, loading: false });

    const { getByTestId } = render(
      <TestProviders startServices={startServices}>
        <DocumentFlyout
          hit={createAlertHit()}
          renderCellActions={jest.fn()}
          onAlertUpdated={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('mock-header')).toHaveAttribute('data-has-on-assignees-updated', 'true');
  });

  describe('remote document callout', () => {
    it('shows the callout for remote alerts', () => {
      (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true, loading: false });

      const { getByText } = render(
        <TestProviders>
          <DocumentFlyout
            hit={createAlertHit({ _index: 'remote-cluster:.alerts-security.alerts-default' })}
            renderCellActions={jest.fn()}
            onAlertUpdated={jest.fn()}
          />
        </TestProviders>
      );

      expect(
        getByText(
          'This alert originates from a remote cluster. Some features may not be available.'
        )
      ).toBeInTheDocument();
    });

    it('shows the callout for remote non-alert documents', () => {
      (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true, loading: false });

      const remoteEventHit: DataTableRecord = {
        id: '1',
        raw: {},
        flattened: { 'event.kind': 'event', _index: 'remote-cluster:logs-system-default' },
        isAnchor: false,
      } as DataTableRecord;

      const { getByText } = render(
        <TestProviders>
          <DocumentFlyout
            hit={remoteEventHit}
            renderCellActions={jest.fn()}
            onAlertUpdated={jest.fn()}
          />
        </TestProviders>
      );

      expect(
        getByText(
          'This event originates from a remote cluster. Some features may not be available.'
        )
      ).toBeInTheDocument();
    });

    it('does not show the callout for local documents', () => {
      (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true, loading: false });

      const { queryByText } = render(
        <TestProviders>
          <DocumentFlyout
            hit={createAlertHit({ _index: '.alerts-security.alerts-default' })}
            renderCellActions={jest.fn()}
            onAlertUpdated={jest.fn()}
          />
        </TestProviders>
      );

      expect(
        queryByText(
          'This alert originates from a remote cluster. Some features may not be available.'
        )
      ).not.toBeInTheDocument();
    });
  });

  describe('Table tab source event link', () => {
    const buildDetails = (items: Array<[string, string[]]>): TimelineEventsDetailsItem[] =>
      items.map(([field, values]) => ({ field, values, isObjectArray: false }));

    // Renders the flyout, switches to the (mocked) Table tab, and returns the `renderFlyoutLink`
    // it was given so the source event link behavior can be exercised directly.
    const renderAndGetRenderFlyoutLink = (): OpenFlyoutLinkRenderer => {
      const { getByTestId } = render(
        <TestProviders startServices={startServices}>
          <DocumentFlyout
            hit={createAlertHit()}
            renderCellActions={jest.fn()}
            onAlertUpdated={jest.fn()}
          />
        </TestProviders>
      );
      fireEvent.click(getByTestId(TABLE_TAB_TEST_ID));
      const { calls } = mockTableTab.mock;
      return calls[calls.length - 1][0].renderFlyoutLink as OpenFlyoutLinkRenderer;
    };

    beforeEach(() => {
      (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true, loading: false });
      jest.mocked(getTimelineEventsDetailsFromRecord).mockReturnValue([]);
    });

    it('opens the ancestor document in a new flyout when a source event value is clicked', () => {
      const openSystemFlyout = jest.fn(() => ({ onClose: Promise.resolve(), close: jest.fn() }));
      startServices.overlays = { ...startServices.overlays, openSystemFlyout };
      jest.mocked(getTimelineEventsDetailsFromRecord).mockReturnValue(
        buildDetails([
          [EVENT_SOURCE_FIELD_NAME, ['ancestor-1']],
          [ANCESTOR_INDEX, ['.ds-logs-source-1']],
        ])
      );

      const renderFlyoutLink = renderAndGetRenderFlyoutLink();

      const { getByTestId } = render(
        <TestProviders startServices={startServices}>
          {renderFlyoutLink({
            field: EVENT_SOURCE_FIELD_NAME,
            value: 'ancestor-1',
            children: <span>{'ancestor-1'}</span>,
          })}
        </TestProviders>
      );

      fireEvent.click(getByTestId(TABLE_TAB_SOURCE_EVENT_LINK_TEST_ID));

      expect(openSystemFlyout).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ session: 'start' })
      );
    });

    it('opens the ancestor document for the legacy signal.ancestors.id field', () => {
      const openSystemFlyout = jest.fn(() => ({ onClose: Promise.resolve(), close: jest.fn() }));
      startServices.overlays = { ...startServices.overlays, openSystemFlyout };
      jest.mocked(getTimelineEventsDetailsFromRecord).mockReturnValue(
        buildDetails([
          [LEGACY_EVENT_SOURCE_FIELD_NAME, ['ancestor-1']],
          ['signal.ancestors.index', ['.ds-logs-source-1']],
        ])
      );

      const renderFlyoutLink = renderAndGetRenderFlyoutLink();

      const { getByTestId } = render(
        <TestProviders startServices={startServices}>
          {renderFlyoutLink({
            field: LEGACY_EVENT_SOURCE_FIELD_NAME,
            value: 'ancestor-1',
            children: <span>{'ancestor-1'}</span>,
          })}
        </TestProviders>
      );

      fireEvent.click(getByTestId(TABLE_TAB_SOURCE_EVENT_LINK_TEST_ID));

      expect(openSystemFlyout).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ session: 'start' })
      );
    });

    it('aligns each ancestor value with its own index', () => {
      const openSystemFlyout = jest.fn(() => ({ onClose: Promise.resolve(), close: jest.fn() }));
      startServices.overlays = { ...startServices.overlays, openSystemFlyout };
      jest.mocked(getTimelineEventsDetailsFromRecord).mockReturnValue(
        buildDetails([
          [EVENT_SOURCE_FIELD_NAME, ['ancestor-1', 'ancestor-2']],
          [ANCESTOR_INDEX, ['.ds-logs-source-1', '.internal.alerts-security.alerts-default']],
        ])
      );

      const renderFlyoutLink = renderAndGetRenderFlyoutLink();

      const { getByTestId } = render(
        <TestProviders startServices={startServices}>
          {renderFlyoutLink({
            field: EVENT_SOURCE_FIELD_NAME,
            value: 'ancestor-2',
            children: <span>{'ancestor-2'}</span>,
          })}
        </TestProviders>
      );

      fireEvent.click(getByTestId(TABLE_TAB_SOURCE_EVENT_LINK_TEST_ID));

      expect(openSystemFlyout).toHaveBeenCalledTimes(1);
    });

    it('renders a source event value as plain text when its index cannot be resolved', () => {
      jest
        .mocked(getTimelineEventsDetailsFromRecord)
        .mockReturnValue(buildDetails([[EVENT_SOURCE_FIELD_NAME, ['ancestor-1']]]));

      const renderFlyoutLink = renderAndGetRenderFlyoutLink();

      const { queryByTestId, getByText } = render(
        <TestProviders>
          {renderFlyoutLink({
            field: EVENT_SOURCE_FIELD_NAME,
            value: 'ancestor-1',
            children: <span>{'ancestor-1'}</span>,
          })}
        </TestProviders>
      );

      expect(queryByTestId(TABLE_TAB_SOURCE_EVENT_LINK_TEST_ID)).toBeNull();
      expect(getByText('ancestor-1')).toBeInTheDocument();
    });

    it('does not link source event values for threshold rules', () => {
      jest.mocked(getTimelineEventsDetailsFromRecord).mockReturnValue(
        buildDetails([
          [ALERT_RULE_TYPE, ['threshold']],
          [EVENT_SOURCE_FIELD_NAME, ['fake-ancestor']],
          [ANCESTOR_INDEX, ['.ds-logs-source-1']],
        ])
      );

      const renderFlyoutLink = renderAndGetRenderFlyoutLink();

      const { queryByTestId } = render(
        <TestProviders>
          {renderFlyoutLink({
            field: EVENT_SOURCE_FIELD_NAME,
            value: 'fake-ancestor',
            children: <span>{'fake-ancestor'}</span>,
          })}
        </TestProviders>
      );

      expect(queryByTestId(TABLE_TAB_SOURCE_EVENT_LINK_TEST_ID)).toBeNull();
    });
  });
});
