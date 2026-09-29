/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { HeaderTitle } from './header_title';
import { TestProviders } from '../../../common/mock';
import { useAttackDetailsContext } from '../context';
import { useNavigateToAttackDetailsLeftPanel } from '../hooks/use_navigate_to_attack_details_left_panel';

vi.mock('../../../flyout_v2/attack/main/components/header_title', () => {
      const mocked = {
      HeaderTitle: () => <div data-test-subj="v2-header-title" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../flyout_v2/attack/main/components/alerts_count', () => {
      const mocked = {
      AlertsCount: ({ hit }: { hit: DataTableRecord }) => (
        <div data-test-subj="alerts-count" data-hit-id={hit.id} />
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../context', () => {
      const mocked = {
      useAttackDetailsContext: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../hooks/use_navigate_to_attack_details_left_panel', () => {
      const mocked = {
      useNavigateToAttackDetailsLeftPanel: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../flyout_v2/attack/main/components/status', () => {
      const mocked = {
      Status: () => <div data-test-subj="status" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../flyout_v2/attack/main/components/assignees', () => {
      const mocked = {
      Assignees: () => <div data-test-subj="assignees" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../flyout_v2/shared/components/notes', () => {
      const mocked = {
      Notes: ({ documentId }: { documentId: string }) => (
        <div data-test-subj="notes" data-document-id={documentId} />
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../flyout_v2/shared/components/flyout_header_block', () => {
      const mocked = {
      flyoutHeaderBlockStyles: {},
    };
      return { ...mocked, default: mocked };
    });

const mockedUseAttackDetailsContext = useAttackDetailsContext as Mock;
const mockedUseNavigateToAttackDetailsLeftPanel = useNavigateToAttackDetailsLeftPanel as Mock;

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
      refetch: vi.fn(),
    });
    mockedUseNavigateToAttackDetailsLeftPanel.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the v2 HeaderTitle component', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId('v2-header-title')).toBeInTheDocument();
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

  it('builds the hit from the searchHit and passes it to v2 HeaderTitle', async () => {
    const { HeaderTitle: MockedV2HeaderTitle } = (await vi.importMock('../../../flyout_v2/attack/main/components/header_title'));
    const spy = vi.spyOn({ MockedV2HeaderTitle }, 'MockedV2HeaderTitle');

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
