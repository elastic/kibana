/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { DocumentFlyout, JSON_TAB_TEST_ID, OVERVIEW_TAB_TEST_ID, TABLE_TAB_TEST_ID } from '.';
import { TestProviders } from '../../../common/mock';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';

jest.mock('../../../detections/containers/detection_engine/alerts/use_alerts_privileges');
jest.mock('../../../common/hooks/is_in_security_app');
jest.mock('./tabs/table_tab', () => ({
  TableTab: () => <div data-test-subj="mock-table-tab" />,
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
});
