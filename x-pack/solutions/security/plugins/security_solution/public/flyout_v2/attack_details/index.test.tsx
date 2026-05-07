/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';

import { AttackDetails } from '.';
import { TestProviders } from '../../common/mock';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';

jest.mock('./context', () => {
  const actual = jest.requireActual('./context');
  return {
    ...actual,
    AttackDetailsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock('./hooks/use_tabs', () => ({
  useTabs: ({
    onShowAttackEntities,
    onShowAttackCorrelations,
  }: {
    onShowAttackEntities: () => void;
    onShowAttackCorrelations: () => void;
  }) => ({
    tabsDisplayed: [
      {
        id: 'overview',
        name: 'Overview',
        content: (
          <div>
            <button
              type="button"
              data-test-subj="mock-overview-tab-show-attack-entities"
              onClick={onShowAttackEntities}
            >
              {'show-attack-entities'}
            </button>
            <button
              type="button"
              data-test-subj="mock-overview-tab-show-attack-correlations"
              onClick={onShowAttackCorrelations}
            >
              {'show-attack-correlations'}
            </button>
          </div>
        ),
        'data-test-subj': 'overview-tab',
      },
      { id: 'json', name: 'JSON', content: 'json-content', 'data-test-subj': 'json-tab' },
    ],
    selectedTabId: 'overview',
    setSelectedTabId: jest.fn(),
  }),
}));

jest.mock('./components/header_title', () => ({
  HeaderTitle: ({ onShowNotes }: { onShowNotes: () => void }) => (
    <button type="button" data-test-subj="mock-header-title" onClick={onShowNotes}>
      {'header-title'}
    </button>
  ),
}));

jest.mock('./footer', () => ({
  Footer: () => <div data-test-subj="mock-footer">{'footer'}</div>,
}));

jest.mock('./attack_entities', () => ({
  AttackEntities: ({ hit }: { hit: DataTableRecord }) => (
    <div data-test-subj="mock-attack-entities" data-attack-id={hit.id} />
  ),
}));

jest.mock('./attack_correlations', () => ({
  AttackCorrelations: ({
    hit,
    onShowAlert,
  }: {
    hit: DataTableRecord;
    onShowAlert: (id: string, indexName: string) => void;
  }) => (
    <button
      type="button"
      data-test-subj="mock-attack-correlations"
      data-attack-id={hit.id}
      onClick={() => onShowAlert('inner-alert-id', 'inner-alert-index')}
    />
  ),
}));

// Bypass the heavy provider stack from `flyoutProviders` so the test can
// inspect the children passed to `overlays.openSystemFlyout` without
// instantiating Kibana/assistant/case providers.
jest.mock('../shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// `DocumentFlyoutWrapper` pulls in heavy dependencies (data view manager,
// `useEsDocSearch`, alerts privileges) that are out of scope for the
// attack-details wiring tests; mock it to a shallow stub.
jest.mock('../document/document_flyout_wrapper', () => ({
  DocumentFlyoutWrapper: ({
    documentId,
    indexName,
  }: {
    documentId?: string;
    indexName?: string;
  }) => (
    <div
      data-test-subj="mock-document-flyout-wrapper"
      data-document-id={documentId}
      data-index-name={indexName}
    />
  ),
}));

const createAttackHit = (extra: DataTableRecord['flattened'] = {}): DataTableRecord =>
  ({
    id: 'attack-1',
    raw: { _index: '.alerts-security.attack.discovery.alerts-default' },
    flattened: { 'event.kind': 'signal', ...extra },
    isAnchor: false,
  } as DataTableRecord);

describe('<AttackDetails />', () => {
  it('renders the header title, the active tab content and the footer', () => {
    const { getByTestId, getByText } = render(
      <TestProviders>
        <AttackDetails
          hit={createAttackHit()}
          onShowNotes={jest.fn()}
          renderCellActions={jest.fn()}
          onAlertUpdated={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('mock-header-title')).toBeInTheDocument();
    expect(getByText('show-attack-entities')).toBeInTheDocument();
    expect(getByTestId('mock-footer')).toBeInTheDocument();
  });

  it('forwards the onShowNotes callback to the header title', () => {
    const onShowNotes = jest.fn();

    const { getByTestId } = render(
      <TestProviders>
        <AttackDetails
          hit={createAttackHit()}
          onShowNotes={onShowNotes}
          renderCellActions={jest.fn()}
          onAlertUpdated={jest.fn()}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('mock-header-title'));

    expect(onShowNotes).toHaveBeenCalledTimes(1);
  });

  it('renders the remote document callout for hits coming from a remote cluster', () => {
    const remoteHit = {
      id: 'attack-1',
      raw: { _index: 'remote-cluster:.alerts-security.attack.discovery.alerts-default' },
      flattened: {
        'event.kind': 'signal',
        _index: 'remote-cluster:.alerts-security.attack.discovery.alerts-default',
      },
      isAnchor: false,
    } as DataTableRecord;

    const { getByText } = render(
      <TestProviders>
        <AttackDetails
          hit={remoteHit}
          onShowNotes={jest.fn()}
          renderCellActions={jest.fn()}
          onAlertUpdated={jest.fn()}
        />
      </TestProviders>
    );

    expect(
      getByText('This alert originates from a remote cluster. Some features may not be available.')
    ).toBeInTheDocument();
  });

  describe('child sub-flyout wiring', () => {
    const renderAttackDetails = (overlays: { openSystemFlyout: jest.Mock }) => {
      const startServices = createStartServicesMock();
      startServices.overlays = {
        ...startServices.overlays,
        ...overlays,
      };

      return render(
        <TestProviders startServices={startServices}>
          <AttackDetails
            hit={createAttackHit()}
            onShowNotes={jest.fn()}
            renderCellActions={jest.fn()}
            onAlertUpdated={jest.fn()}
          />
        </TestProviders>
      );
    };

    it('opens the AttackEntities child flyout when onShowAttackEntities fires', () => {
      const openSystemFlyout = jest.fn();

      const { getByTestId } = renderAttackDetails({ openSystemFlyout });

      fireEvent.click(getByTestId('mock-overview-tab-show-attack-entities'));

      expect(openSystemFlyout).toHaveBeenCalledTimes(1);
      const [children, options] = openSystemFlyout.mock.calls[0];
      expect(children).toBeDefined();

      const { getByTestId: getByTestIdInPortal } = render(children);
      expect(getByTestIdInPortal('mock-attack-entities')).toBeInTheDocument();

      expect(options).toEqual(
        expect.objectContaining({
          ownFocus: false,
          resizable: true,
          size: 'm',
          session: 'start',
        })
      );
    });

    it('opens the AttackCorrelations child flyout when onShowAttackCorrelations fires', () => {
      const openSystemFlyout = jest.fn();

      const { getByTestId } = renderAttackDetails({ openSystemFlyout });

      fireEvent.click(getByTestId('mock-overview-tab-show-attack-correlations'));

      expect(openSystemFlyout).toHaveBeenCalledTimes(1);
      const [children, options] = openSystemFlyout.mock.calls[0];

      const { getByTestId: getByTestIdInPortal } = render(children);
      expect(getByTestIdInPortal('mock-attack-correlations')).toBeInTheDocument();

      expect(options).toEqual(
        expect.objectContaining({
          ownFocus: false,
          resizable: true,
          size: 'm',
          session: 'start',
        })
      );
    });

    it('opens the alert document flyout when the correlations table fires onShowAlert', () => {
      const openSystemFlyout = jest.fn();

      const { getByTestId } = renderAttackDetails({ openSystemFlyout });

      // Open the AttackCorrelations child flyout first.
      fireEvent.click(getByTestId('mock-overview-tab-show-attack-correlations'));
      expect(openSystemFlyout).toHaveBeenCalledTimes(1);

      // Render the AttackCorrelations children element so we can fire its
      // mocked onShowAlert callback.
      const correlationsChildren = openSystemFlyout.mock.calls[0][0];
      const { getByTestId: getByTestIdInPortal } = render(correlationsChildren);
      fireEvent.click(getByTestIdInPortal('mock-attack-correlations'));

      // Second openSystemFlyout call should be the document flyout wrapper.
      expect(openSystemFlyout).toHaveBeenCalledTimes(2);
      const [alertChildren, alertOptions] = openSystemFlyout.mock.calls[1];

      const { getByTestId: getByTestIdAlert } = render(alertChildren);
      const documentFlyout = getByTestIdAlert('mock-document-flyout-wrapper');
      expect(documentFlyout).toHaveAttribute('data-document-id', 'inner-alert-id');
      expect(documentFlyout).toHaveAttribute('data-index-name', 'inner-alert-index');
      expect(alertOptions).toEqual(expect.objectContaining({ session: 'inherit' }));
    });
  });
});
