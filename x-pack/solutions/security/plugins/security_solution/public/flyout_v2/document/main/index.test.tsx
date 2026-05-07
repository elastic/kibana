/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
} from '@kbn/elastic-assistant-common';
import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { DocumentFlyout } from '.';
import { TestProviders } from '../../../common/mock';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';

jest.mock('../../../detections/containers/detection_engine/alerts/use_alerts_privileges');
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
jest.mock('../attack_details', () => ({
  AttackDetails: ({
    onShowNotes,
    renderCellActions,
    onAlertUpdated,
  }: {
    onShowNotes: () => void;
    renderCellActions: unknown;
    onAlertUpdated: () => void;
  }) => (
    <button
      type="button"
      data-test-subj="mock-attack-details"
      data-has-render-cell-actions={String(renderCellActions != null)}
      data-has-on-alert-updated={String(onAlertUpdated != null)}
      onClick={onShowNotes}
    />
  ),
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

  describe('attack-discovery routing', () => {
    beforeEach(() => {
      (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true, loading: false });
    });

    it('renders the v2 attack details panel for attack-discovery scheduled alerts', () => {
      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <DocumentFlyout
            hit={createAlertHit({
              [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
            })}
            renderCellActions={jest.fn()}
            onAlertUpdated={jest.fn()}
          />
        </TestProviders>
      );

      expect(getByTestId('mock-attack-details')).toBeInTheDocument();
      expect(queryByTestId('mock-header')).not.toBeInTheDocument();
      expect(queryByTestId('mock-overview-tab')).not.toBeInTheDocument();
      expect(queryByTestId('mock-footer')).not.toBeInTheDocument();
    });

    it('renders the v2 attack details panel for attack-discovery ad-hoc alerts', () => {
      const { getByTestId } = render(
        <TestProviders>
          <DocumentFlyout
            hit={createAlertHit({
              [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
            })}
            renderCellActions={jest.fn()}
            onAlertUpdated={jest.fn()}
          />
        </TestProviders>
      );

      expect(getByTestId('mock-attack-details')).toBeInTheDocument();
    });

    it('still renders the standard document flyout for non-attack-discovery alerts', () => {
      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <DocumentFlyout
            hit={createAlertHit({ [ALERT_RULE_TYPE_ID]: 'siem.queryRule' })}
            renderCellActions={jest.fn()}
            onAlertUpdated={jest.fn()}
          />
        </TestProviders>
      );

      expect(getByTestId('mock-header')).toBeInTheDocument();
      expect(queryByTestId('mock-attack-details')).not.toBeInTheDocument();
    });

    it('threads renderCellActions and onAlertUpdated through to the v2 attack details panel', () => {
      const { getByTestId } = render(
        <TestProviders>
          <DocumentFlyout
            hit={createAlertHit({
              [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
            })}
            renderCellActions={jest.fn()}
            onAlertUpdated={jest.fn()}
          />
        </TestProviders>
      );

      expect(getByTestId('mock-attack-details')).toHaveAttribute(
        'data-has-render-cell-actions',
        'true'
      );
      expect(getByTestId('mock-attack-details')).toHaveAttribute(
        'data-has-on-alert-updated',
        'true'
      );
    });

    it('threads onShowNotes through to the v2 attack details panel', () => {
      const openSystemFlyout = jest.fn();
      startServices.overlays = {
        ...startServices.overlays,
        openSystemFlyout,
      };

      const { getByTestId } = render(
        <TestProviders startServices={startServices}>
          <DocumentFlyout
            hit={createAlertHit({
              [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
            })}
            renderCellActions={jest.fn()}
            onAlertUpdated={jest.fn()}
          />
        </TestProviders>
      );

      fireEvent.click(getByTestId('mock-attack-details'));

      expect(openSystemFlyout).toHaveBeenCalledTimes(1);
    });
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
