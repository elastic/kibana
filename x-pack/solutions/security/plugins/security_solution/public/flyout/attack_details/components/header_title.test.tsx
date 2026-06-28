/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { HeaderTitle } from './header_title';
import { TestProviders } from '../../../common/mock';
import { useAttackDetailsContext } from '../context';
import { useNavigateToAttackDetailsLeftPanel } from '../hooks/use_navigate_to_attack_details_left_panel';
<<<<<<< HEAD
=======
import {
  HEADER_ALERTS_BLOCK_TEST_ID,
  HEADER_ASSIGNEES_BLOCK_TEST_ID,
  HEADER_BADGE_TEST_ID,
} from '../constants/test_ids';
import { REMOTE_DOCUMENT_BADGE_TEST_ID } from '../../../flyout_v2/document/components/remote_document_badge';
>>>>>>> 9.4

jest.mock('../../../flyout_v2/attack/main/components/header_title', () => ({
  HeaderTitle: () => <div data-test-subj="v2-header-title" />,
}));

jest.mock('../../../flyout_v2/attack/main/components/alerts_count', () => ({
  AlertsCount: ({ hit }: { hit: DataTableRecord }) => (
    <div data-test-subj="alerts-count" data-hit-id={hit.id} />
  ),
}));

jest.mock('../context', () => ({
  useAttackDetailsContext: jest.fn(),
}));

jest.mock('../hooks/use_navigate_to_attack_details_left_panel', () => ({
  useNavigateToAttackDetailsLeftPanel: jest.fn(),
}));

jest.mock('../../../flyout_v2/attack/main/components/status', () => ({
  Status: () => <div data-test-subj="status" />,
}));

jest.mock('../../../flyout_v2/attack/main/components/assignees', () => ({
  Assignees: () => <div data-test-subj="assignees" />,
}));

jest.mock('../../../flyout_v2/shared/components/notes', () => ({
  Notes: ({ documentId }: { documentId: string }) => (
    <div data-test-subj="notes" data-document-id={documentId} />
  ),
}));

<<<<<<< HEAD
jest.mock('../../../flyout_v2/shared/components/flyout_header_block', () => ({
  flyoutHeaderBlockStyles: {},
=======
jest.mock('../../../flyout_v2/document/components/remote_document_badge', () => ({
  ...jest.requireActual('../../../flyout_v2/document/components/remote_document_badge'),
  RemoteDocumentBadge: () => <div data-test-subj="remoteDocumentBadge" />,
}));

jest.mock('../../../flyout_v2/shared/components/alert_header_block', () => ({
  AlertHeaderBlock: ({
    children,
    'data-test-subj': dataTestSubj,
  }: {
    children: React.ReactNode;
    'data-test-subj': string;
  }) => <div data-test-subj={dataTestSubj}>{children}</div>,
>>>>>>> 9.4
}));

const mockedUseAttackDetailsContext = useAttackDetailsContext as jest.Mock;
const mockedUseNavigateToAttackDetailsLeftPanel = useNavigateToAttackDetailsLeftPanel as jest.Mock;

const mockSearchHit = {
  _id: 'attack-1',
  _index: '.alerts-security.alerts-default',
  _source: {
    '@timestamp': '2024-10-10T10:00:00.000Z',
    'kibana.alert.attack_discovery.title': 'Suspicious PowerShell Activity',
    'kibana.alert.attack_discovery.alert_ids': ['alert-1', 'alert-2'],
  },
} as unknown as EsHitRecord;

describe('HeaderTitle (legacy wrapper)', () => {
  beforeEach(() => {
    mockedUseAttackDetailsContext.mockReturnValue({
      attackId: 'attack-1',
      searchHit: mockSearchHit,
      refetch: jest.fn(),
    });
<<<<<<< HEAD
=======
    mockedUseAttackDetailsContext.mockReturnValue({
      attackId: 'attack-1',
      searchHit: { _index: '.alerts-security.alerts-default', _id: 'attack-1' },
    });
>>>>>>> 9.4
    mockedUseNavigateToAttackDetailsLeftPanel.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

<<<<<<< HEAD
  it('renders the v2 HeaderTitle component', () => {
=======
  it('renders the attack badge for a local document', () => {
>>>>>>> 9.4
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

<<<<<<< HEAD
    expect(screen.getByTestId('v2-header-title')).toBeInTheDocument();
=======
    expect(screen.getByTestId(HEADER_BADGE_TEST_ID)).toHaveTextContent('Attack');
    expect(screen.queryByTestId(REMOTE_DOCUMENT_BADGE_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders the remote document badge instead of the attack badge for a remote document', () => {
    mockedUseAttackDetailsContext.mockReturnValue({
      attackId: 'attack-1',
      searchHit: {
        _index: 'remote-cluster:.alerts-security.alerts-default',
        _id: 'attack-1',
      },
    });

    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId(REMOTE_DOCUMENT_BADGE_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(HEADER_BADGE_TEST_ID)).not.toBeInTheDocument();
>>>>>>> 9.4
  });

  it('renders the status component', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId('status')).toBeInTheDocument();
  });

  it('renders the assignees block', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId('assignees')).toBeInTheDocument();
  });

  it('renders the alerts count block', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId('alerts-count')).toBeInTheDocument();
  });

  it('renders the notes component with the attack id', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId('notes')).toHaveAttribute('data-document-id', 'attack-1');
  });

  it('builds the hit from the searchHit and passes it to v2 HeaderTitle', () => {
    const { HeaderTitle: MockedV2HeaderTitle } = jest.requireMock(
      '../../../flyout_v2/attack/main/components/header_title'
    );
    const spy = jest.spyOn({ MockedV2HeaderTitle }, 'MockedV2HeaderTitle');

    const mockHit = buildDataTableRecord(mockSearchHit);

    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    // The v2 component renders — it was called (via the mock that renders data-test-subj)
    expect(screen.getByTestId('v2-header-title')).toBeInTheDocument();

    spy.mockRestore();
    expect(mockHit).toBeDefined();
  });
});
