/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { AttackDetailsLeftPanel } from '.';
import { AttackDetailsProvider } from '../context';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { NOTES_DETAILS_TEST_ID } from '../../../flyout_v2/notes/test_ids';

jest.mock('../../shared/components/flyout_header', () => ({
  FlyoutHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="flyout-header">{children}</div>
  ),
}));

jest.mock('../../shared/components/flyout_body', () => ({
  FlyoutBody: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="flyout-body">{children}</div>
  ),
}));

jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: () => 'default',
}));

jest.mock('../hooks/use_attack_details', () => {
  return {
    useAttackDetails: jest.fn().mockReturnValue({
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
      getFieldsData: jest.fn(),
      refetch: jest.fn(),
    }),
  };
});

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({
    openLeftPanel: jest.fn(),
  }),
  useExpandableFlyoutState: () => ({
    left: { path: { tab: 'insights', subTab: 'entity' } },
  }),
}));

jest.mock('../../../flyout_v2/notes/components/notes_details_content', () => ({
  NotesDetailsContent: () => (
    <div data-test-subj="attack-details-flyout-left-notes-tab-content">{'Notes content'}</div>
  ),
}));

jest.mock('../hooks/use_header_data', () => ({
  useHeaderData: jest.fn().mockReturnValue({ timestamp: '' }),
}));

jest.mock('../hooks/use_attack_entities_lists', () => ({
  useAttackEntitiesLists: jest.fn().mockReturnValue({
    userEntityIdentifiers: [],
    hostEntityIdentifiers: [],
    loading: false,
    error: false,
  }),
}));

jest.mock('../../../common/components/user_privileges');
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

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
