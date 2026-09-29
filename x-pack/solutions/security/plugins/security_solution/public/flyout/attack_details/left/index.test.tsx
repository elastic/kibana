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
import { TestProviders } from '../../../common/mock';
import { AttackDetailsLeftPanel } from '.';
import { AttackDetailsProvider } from '../context';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { NOTES_DETAILS_TEST_ID } from '../../../flyout_v2/shared/tools/notes/test_ids';

vi.mock('../../shared/components/flyout_header', () => {
      const mocked = {
      FlyoutHeader: ({ children }: { children: React.ReactNode }) => (
        <div data-test-subj="flyout-header">{children}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../shared/components/flyout_body', () => {
      const mocked = {
      FlyoutBody: ({ children }: { children: React.ReactNode }) => (
        <div data-test-subj="flyout-body">{children}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/hooks/use_space_id', () => {
      const mocked = {
      useSpaceId: () => 'default',
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../hooks/use_attack_details', () => {
  return {
    useAttackDetails: vi.fn().mockReturnValue({
      loading: false,
      attack: {
        id: 'test-alert-1',
        alertIds: ['alert-1'],
        detectionEngineRuleId: 'rule-1',
        ruleStatus: 'enabled',
        ruleVersion: 1,
        timestamp: '2024-01-01T00:00:00Z',
        entities: {
          users: [],
          hosts: [],
        },
        summaryMarkdown: '# Test Alert Summary',
        mitreTactics: [],
        mitreTechniques: [],
      },
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      searchHit: { _index: 'test', _id: 'test-id' },
      getFieldsData: vi.fn(),
      refetch: vi.fn(),
    }),
  };
});

vi.mock('@kbn/expandable-flyout', () => {
      const mocked = {
      useExpandableFlyoutApi: () => ({
        openLeftPanel: vi.fn(),
      }),
      useExpandableFlyoutState: () => ({
        left: { path: { tab: 'insights', subTab: 'entity' } },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../flyout_v2/shared/tools/notes/components/notes_details_content', () => {
      const mocked = {
      NotesDetailsContent: () => (
        <div data-test-subj="attack-details-flyout-left-notes-tab-content">{'Notes content'}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../hooks/use_header_data', () => {
      const mocked = {
      useHeaderData: vi.fn().mockReturnValue({ timestamp: '' }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../hooks/use_original_alert_ids', () => {
      const mocked = {
      useOriginalAlertIds: vi.fn().mockReturnValue([]),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../flyout_v2/attack/tools/entities/hooks/use_attack_entities_lists', () => {
      const mocked = {
      useAttackEntitiesLists: vi.fn().mockReturnValue({
        userEntityEntries: [],
        hostEntityEntries: [],
        loading: false,
        error: false,
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/components/user_privileges');
const useUserPrivilegesMock = useUserPrivileges as Mock;

const renderLeftPanel = (path?: { tab: string; subTab?: string }) =>
  render(
    <TestProviders>
      <AttackDetailsProvider attackId="test-id" indexName=".alerts-security.alerts-default">
        <AttackDetailsLeftPanel path={path} />
      </AttackDetailsProvider>
    </TestProviders>
  );

describe('AttackDetailsLeftPanel', () => {
  beforeEach(() => {
    useUserPrivilegesMock.mockReturnValue({
      notesPrivileges: { read: true, crud: true },
    });
  });

  it('renders when provided with context via AttackDetailsProvider', () => {
    renderLeftPanel();

    expect(screen.getByTestId('flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId('flyout-body')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });

  it('renders Notes tab when user has notes read privilege', () => {
    renderLeftPanel();

    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByTestId(NOTES_DETAILS_TEST_ID)).toBeInTheDocument();
  });

  it('hides Notes tab when user lacks notes read privilege', () => {
    useUserPrivilegesMock.mockReturnValue({
      notesPrivileges: { read: false, crud: false },
    });

    renderLeftPanel();

    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
    expect(screen.queryByTestId(NOTES_DETAILS_TEST_ID)).not.toBeInTheDocument();
  });
});
