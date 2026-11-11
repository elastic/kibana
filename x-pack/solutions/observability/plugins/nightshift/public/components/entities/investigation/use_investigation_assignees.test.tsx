/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type {
  AssigneePickerProps,
  UseAssigneePickersOptions,
} from '@kbn/agentic-investigations-plugin/public';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { useInvestigationAssignees } from './use_investigation_assignees';

const mutateAsync = jest.fn();
let canManage = true;
let pickerOptions: UseAssigneePickersOptions<InvestigationSummary> | undefined;

const profile = (uid: string): UserProfileWithAvatar => ({
  uid,
  enabled: true,
  data: {},
  user: { username: uid, full_name: `User ${uid}` },
});

jest.mock('@kbn/agentic-investigations-plugin/public', () => ({
  useAssignInvestigation: () => ({ mutateAsync }),
  useCanManageInvestigations: () => canManage,
  // Stands in for the profile lookup: every assignee uid resolves to a profile.
  useAssigneePickers:
    (options: UseAssigneePickersOptions<InvestigationSummary>) =>
    (item: InvestigationSummary): AssigneePickerProps => {
      pickerOptions = options;
      return {
        conversationId: options.getRowKey(item),
        selected: options.getAssigneeUids(item).map(profile),
        suggestions: [],
        isSuggestionsLoading: false,
        canManage: options.canManage && !(options.isReadOnly?.(item) ?? false),
        onSearchChange: () => {},
        onChange: () => {},
        buttonIconSize: options.buttonIconSize,
      };
    },
}));

const investigation = (
  id: string,
  metadata: Partial<InvestigationSummary['metadata']> = {}
): InvestigationSummary => ({
  id,
  title: `Investigation ${id}`,
  title_pending: false,
  created_at: '2026-09-11T09:00:00.000Z',
  updated_at: '2026-09-11T09:00:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open', ...metadata },
  in_progress: false,
  subjects: [],
});

const Cards = ({ investigations }: { investigations: InvestigationSummary[] }) => {
  const renderAssignees = useInvestigationAssignees(investigations);
  return (
    <>
      {investigations.map((item) => (
        <div key={item.id} data-test-subj={`card-${item.id}`}>
          {renderAssignees(item)}
        </div>
      ))}
    </>
  );
};

const renderCards = (investigations: InvestigationSummary[], queryClient = new QueryClient()) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <Cards investigations={investigations} />
        </QueryClientProvider>
      </I18nProvider>
    </EuiProvider>
  );

const avatarsIn = (card: HTMLElement) => within(card).queryAllByRole('img', { name: /^User uid-/ });

describe('useInvestigationAssignees', () => {
  beforeEach(() => {
    canManage = true;
    pickerOptions = undefined;
    mutateAsync.mockReset();
  });

  it('shows the assignees of each card with the assign button', () => {
    renderCards([investigation('two', { assignees: ['uid-1', 'uid-2'] }), investigation('none')]);

    const assigned = screen.getByTestId('card-two');
    expect(avatarsIn(assigned)).toHaveLength(2);
    expect(within(assigned).getByTestId('assignToUsersAdd-two')).toBeInTheDocument();

    const unassigned = screen.getByTestId('card-none');
    expect(avatarsIn(unassigned)).toHaveLength(0);
    expect(within(unassigned).getByTestId('assignToUsersAdd-none')).toBeInTheDocument();
  });

  it('folds assignees past the fourth into a +n badge', () => {
    renderCards([
      investigation('many', { assignees: ['uid-1', 'uid-2', 'uid-3', 'uid-4', 'uid-5', 'uid-6'] }),
    ]);

    const card = screen.getByTestId('card-many');
    expect(avatarsIn(card)).toHaveLength(4);
    expect(within(card).getByText('+2')).toBeInTheDocument();
  });

  it('is read-only for a closed investigation', () => {
    renderCards([investigation('closed', { status: 'closed', assignees: ['uid-1'] })]);

    const card = screen.getByTestId('card-closed');
    expect(avatarsIn(card)).toHaveLength(1);
    expect(within(card).queryByTestId('assignToUsersAdd-closed')).not.toBeInTheDocument();
  });

  it('is read-only when the user cannot manage investigations', () => {
    canManage = false;
    renderCards([investigation('open', { assignees: ['uid-1'] })]);

    const card = screen.getByTestId('card-open');
    expect(avatarsIn(card)).toHaveLength(1);
    expect(within(card).queryByTestId('assignToUsersAdd-open')).not.toBeInTheDocument();
  });

  it('assigns through the investigation API and refetches the investigations afterwards', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    renderCards([investigation('one')], queryClient);

    await pickerOptions!.assign('one', ['uid-1', 'uid-2']);
    expect(mutateAsync).toHaveBeenCalledWith({
      investigationId: 'one',
      assignees: ['uid-1', 'uid-2'],
    });

    await pickerOptions!.refresh();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['nightshift.investigations'],
    });
  });
});
