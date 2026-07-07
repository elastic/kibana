/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { AttackFlyout, JSON_TAB_TEST_ID, OVERVIEW_TAB_TEST_ID, TABLE_TAB_TEST_ID } from '.';
import { TestProviders } from '../../../common/mock';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { documentFlyoutHistoryKey } from '../../shared/constants/flyout_history';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';

jest.mock('../../../common/hooks/is_in_security_app');

jest.mock('./footer', () => ({
  Footer: ({ onAttackUpdated }: { onAttackUpdated: () => void }) => (
    <button
      type="button"
      data-test-subj="mock-footer"
      data-has-on-attack-updated={String(onAttackUpdated != null)}
      onClick={onAttackUpdated}
    />
  ),
}));

jest.mock('./header', () => ({
  Header: ({
    onAttackUpdated,
    onShowNotes,
  }: {
    onAttackUpdated: () => void;
    onShowNotes: () => void;
  }) => (
    <button
      type="button"
      data-test-subj="mock-header"
      data-has-on-attack-updated={String(onAttackUpdated != null)}
      onClick={onShowNotes}
    />
  ),
}));

jest.mock('./tabs/overview_tab', () => ({
  OverviewTab: ({ onAttackUpdated }: { onAttackUpdated: () => void }) => (
    <div
      data-test-subj="mock-overview-tab"
      data-has-on-attack-updated={String(onAttackUpdated != null)}
    />
  ),
}));
jest.mock('./tabs/table_tab', () => ({
  TableTab: () => <div data-test-subj="mock-table-tab" />,
}));
jest.mock('../../shared/components/json_tab', () => ({
  JsonTab: () => <div data-test-subj="mock-json-tab" />,
}));

jest.mock('../../shared/tools/notes', () => ({
  NotesDetails: () => <div data-test-subj="mock-notes-details" />,
}));

const createAttackHit = (extra: DataTableRecord['flattened'] = {}): DataTableRecord =>
  ({
    id: 'attack-1',
    raw: { _id: 'attack-1', _index: '.alerts-security.attack-discovery.alerts-default' },
    flattened: {
      _id: 'attack-1',
      _index: '.alerts-security.attack-discovery.alerts-default',
      '@timestamp': '2024-01-01T00:00:00.000Z',
      'kibana.alert.attack_discovery.title': 'Test attack',
      ...extra,
    },
    isAnchor: false,
  } as DataTableRecord);

const mockAttack = {} as AttackDiscoveryAlert;

describe('<AttackFlyout />', () => {
  const startServices = createStartServicesMock();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useIsInSecurityApp).mockReturnValue(true);
  });

  it('renders the header, body, and footer', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AttackFlyout hit={createAttackHit()} attack={mockAttack} onAttackUpdated={jest.fn()} />
      </TestProviders>
    );

    expect(getByTestId('mock-header')).toBeInTheDocument();
    expect(getByTestId('attack-flyout-body')).toBeInTheDocument();
    expect(getByTestId('attack-flyout-footer')).toBeInTheDocument();
  });

  it('renders Overview and JSON tabs and switches between them', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <AttackFlyout hit={createAttackHit()} attack={mockAttack} onAttackUpdated={jest.fn()} />
      </TestProviders>
    );

    // both tab buttons are present
    expect(getByTestId(OVERVIEW_TAB_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TABLE_TAB_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(JSON_TAB_TEST_ID)).toBeInTheDocument();

    // overview is selected by default
    expect(getByTestId('mock-overview-tab')).toBeInTheDocument();
    expect(queryByTestId('mock-table-tab')).not.toBeInTheDocument();
    expect(queryByTestId('mock-json-tab')).not.toBeInTheDocument();

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

  it('renders without errors given a minimal DataTableRecord hit', () => {
    const minimalHit: DataTableRecord = {
      id: 'minimal',
      raw: {},
      flattened: {},
      isAnchor: false,
    } as DataTableRecord;

    const { getByTestId } = render(
      <TestProviders>
        <AttackFlyout hit={minimalHit} attack={mockAttack} onAttackUpdated={jest.fn()} />
      </TestProviders>
    );

    expect(getByTestId('mock-header')).toBeInTheDocument();
    expect(getByTestId('attack-flyout-body')).toBeInTheDocument();
    expect(getByTestId('attack-flyout-footer')).toBeInTheDocument();
  });

  it('opens notes in a system flyout when the notes action is clicked', () => {
    const openSystemFlyout = jest.fn();
    startServices.overlays = {
      ...startServices.overlays,
      openSystemFlyout,
    };

    const { getByTestId } = render(
      <TestProviders startServices={startServices}>
        <AttackFlyout hit={createAttackHit()} attack={mockAttack} onAttackUpdated={jest.fn()} />
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
        session: 'start',
        historyKey: documentFlyoutHistoryKey,
      })
    );
  });

  it('uses the discover history key when outside the security app', () => {
    jest.mocked(useIsInSecurityApp).mockReturnValue(false);
    const openSystemFlyout = jest.fn();
    startServices.overlays = {
      ...startServices.overlays,
      openSystemFlyout,
    };

    const { getByTestId } = render(
      <TestProviders startServices={startServices}>
        <AttackFlyout hit={createAttackHit()} attack={mockAttack} onAttackUpdated={jest.fn()} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('mock-header'));

    expect(openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        session: 'start',
        historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY,
      })
    );
  });

  it('passes onAttackUpdated callback to the header and footer', () => {
    const onAttackUpdated = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <AttackFlyout
          hit={createAttackHit()}
          attack={mockAttack}
          onAttackUpdated={onAttackUpdated}
        />
      </TestProviders>
    );

    expect(getByTestId('mock-header')).toHaveAttribute('data-has-on-attack-updated', 'true');
    expect(getByTestId('mock-footer')).toHaveAttribute('data-has-on-attack-updated', 'true');
  });

  it('forwards onAttackUpdated unchanged so the wrapper-supplied refetch fires', () => {
    const onAttackUpdated = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <AttackFlyout
          hit={createAttackHit()}
          attack={mockAttack}
          onAttackUpdated={onAttackUpdated}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('mock-footer'));
    expect(onAttackUpdated).toHaveBeenCalledTimes(1);
  });
});
