/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import type { CommonAttachmentListViewProps } from '@kbn/cases-plugin/public';
import { SECURITY_ATTACK_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { AttackTabContent } from './attack_tab_content';
import {
  ATTACK_TAB_EMPTY_TEST_ID,
  ATTACK_TAB_ROW_STATUS_TEST_ID,
  ATTACK_TAB_ROW_TITLE_TEST_ID,
  ATTACK_TAB_ROW_UNRESOLVED_TEST_ID,
  ATTACK_TAB_TABLE_TEST_ID,
} from '../../../../../common/cases/attachments/attack/test_ids';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useFindAttackDiscoveries } from '../../../../attack_discovery/pages/use_find_attack_discoveries';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';

jest.mock('../../../../attack_discovery/pages/use_find_attack_discoveries');
jest.mock('../../../../assistant/use_assistant_availability');
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: jest.fn() }),
}));
jest.mock('../../../../flyout_v2/use_flyout_api', () => ({
  useFlyoutApi: () => ({ openAttackFlyout: jest.fn() }),
}));
jest.mock('../../../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: () => true,
}));

const useFindAttackDiscoveriesMock = useFindAttackDiscoveries as jest.Mock;
const useAssistantAvailabilityMock = useAssistantAvailability as jest.Mock;

const buildAttachment = (overrides: Record<string, unknown> = {}) => ({
  id: 'so-1',
  type: SECURITY_ATTACK_ATTACHMENT_TYPE,
  attachmentId: 'attack-id-1',
  createdAt: '2026-08-20T10:00:00.000Z',
  createdBy: { fullName: 'Ada Lovelace', username: 'ada', email: null },
  metadata: {
    title: 'Snapshotted attack title',
    summaryMarkdown: 'An adversary dumped LSASS memory',
    riskScore: 42,
    alertCount: 4,
    entityCount: 2,
    index: '.alerts-security.attack.discovery.alerts-default',
  },
  ...overrides,
});

const buildCaseData = (comments: unknown[]) =>
  ({
    id: 'case-1',
    owner: 'securitySolution',
    comments,
  } as CommonAttachmentListViewProps['caseData']);

const liveAttack = {
  id: 'attack-id-1',
  title: 'Live attack title',
  riskScore: 77,
  alertIds: ['a', 'b', 'c'],
  alertWorkflowStatus: 'acknowledged',
  index: '.alerts-security.attack.discovery.alerts-default',
  replacements: {},
};

const mockFindResult = (attacks: unknown[], overrides: Record<string, unknown> = {}) => {
  useFindAttackDiscoveriesMock.mockReturnValue({
    data: { data: attacks, page: 1, per_page: 10, total: attacks.length, connector_names: [] },
    isLoading: false,
    status: 'success',
    error: undefined,
    cancelRequest: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  });
};

const renderTab = (props?: Partial<CommonAttachmentListViewProps>) =>
  render(
    <TestProviders>
      <AttackTabContent caseData={buildCaseData([buildAttachment()])} {...props} />
    </TestProviders>
  );

describe('AttackTabContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAssistantAvailabilityMock.mockReturnValue({ isAssistantEnabled: true });
    mockFindResult([liveAttack]);
  });

  it('renders an empty state and fires no query when no attacks are attached', () => {
    render(
      <TestProviders>
        <AttackTabContent caseData={buildCaseData([])} />
      </TestProviders>
    );

    expect(screen.getByTestId(ATTACK_TAB_EMPTY_TEST_ID)).toHaveTextContent(
      'No attacks have been attached to this case yet.'
    );
    expect(screen.queryByTestId(ATTACK_TAB_TABLE_TEST_ID)).not.toBeInTheDocument();
    expect(useFindAttackDiscoveriesMock).not.toHaveBeenCalled();
  });

  it('renders an empty state when the search term matches no attachment', () => {
    renderTab({ searchTerm: 'kerberoasting' });

    expect(screen.getByTestId(ATTACK_TAB_EMPTY_TEST_ID)).toHaveTextContent(
      'No attacks match your search.'
    );
    expect(useFindAttackDiscoveriesMock).not.toHaveBeenCalled();
  });

  it('keeps attachments matching the search term', () => {
    renderTab({ searchTerm: 'snapshotted' });

    expect(screen.getByTestId(ATTACK_TAB_TABLE_TEST_ID)).toBeInTheDocument();
  });

  it('queries every attached attack id in a single request', () => {
    render(
      <TestProviders>
        <AttackTabContent
          caseData={buildCaseData([
            buildAttachment(),
            buildAttachment({ id: 'so-2', attachmentId: 'attack-id-2' }),
          ])}
        />
      </TestProviders>
    );

    expect(useFindAttackDiscoveriesMock).toHaveBeenCalledTimes(1);
    expect(useFindAttackDiscoveriesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ids: ['attack-id-1', 'attack-id-2'],
        includeAllAuthors: true,
        isAssistantEnabled: true,
        perPage: 2,
      })
    );
  });

  it('renders one row per attached attack with the live attack state', () => {
    renderTab();

    expect(screen.getByTestId(ATTACK_TAB_TABLE_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(ATTACK_TAB_ROW_TITLE_TEST_ID)).toHaveTextContent('Live attack title');
    // Risk score and alert count come from the live document, not the snapshot.
    expect(screen.getByText('77')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByTestId(ATTACK_TAB_ROW_STATUS_TEST_ID)).toHaveTextContent('acknowledged');
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('exposes the show attack button on each row', () => {
    renderTab();

    expect(screen.getByTestId('comment-action-show-attack-so-1')).toBeEnabled();
  });

  it('falls back to the snapshotted metadata and disables navigation for an unresolved attack', () => {
    mockFindResult([]);

    renderTab();

    expect(screen.getByTestId(ATTACK_TAB_ROW_TITLE_TEST_ID)).toHaveTextContent(
      'Snapshotted attack title'
    );
    expect(screen.getByTestId(ATTACK_TAB_ROW_UNRESOLVED_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByTestId('comment-action-show-attack-so-1')).toBeDisabled();
  });

  it('keeps an unresolved row alongside a resolved one', () => {
    mockFindResult([liveAttack]);

    render(
      <TestProviders>
        <AttackTabContent
          caseData={buildCaseData([
            buildAttachment(),
            buildAttachment({
              id: 'so-2',
              attachmentId: 'attack-id-2',
              metadata: {
                title: 'Deleted attack',
                alertCount: 1,
                index: '.alerts-security.attack.discovery.alerts-default',
              },
            }),
          ])}
        />
      </TestProviders>
    );

    const titles = screen.getAllByTestId(ATTACK_TAB_ROW_TITLE_TEST_ID);
    expect(titles).toHaveLength(2);
    expect(screen.getByTestId('comment-action-show-attack-so-1')).toBeEnabled();
    expect(screen.getByTestId('comment-action-show-attack-so-2')).toBeDisabled();
  });

  it('does not mark rows unresolved while the query is still loading', () => {
    mockFindResult([], { isLoading: true, status: 'loading', data: undefined });

    renderTab();

    expect(screen.queryByTestId(ATTACK_TAB_ROW_UNRESOLVED_TEST_ID)).not.toBeInTheDocument();
    expect(screen.getByTestId('comment-action-show-attack-so-1')).toBeEnabled();
  });

  it('falls back to Unknown when the attaching user has no name', () => {
    mockFindResult([liveAttack]);

    render(
      <TestProviders>
        <AttackTabContent
          caseData={buildCaseData([
            buildAttachment({ createdBy: { fullName: null, username: null, email: null } }),
          ])}
        />
      </TestProviders>
    );

    expect(
      within(screen.getByTestId(ATTACK_TAB_TABLE_TEST_ID)).getByText('Unknown')
    ).toBeInTheDocument();
  });

  it('ignores attachments of other types', () => {
    render(
      <TestProviders>
        <AttackTabContent caseData={buildCaseData([buildAttachment({ type: 'security.alert' })])} />
      </TestProviders>
    );

    expect(screen.getByTestId(ATTACK_TAB_EMPTY_TEST_ID)).toBeInTheDocument();
  });
});
