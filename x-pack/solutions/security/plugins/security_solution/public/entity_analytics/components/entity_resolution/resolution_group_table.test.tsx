/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { ResolutionGroupTable } from './resolution_group_table';
import { RESOLUTION_GROUP_TABLE_TEST_ID, RESOLUTION_EMPTY_STATE_TEST_ID } from './test_ids';
import type { ResolutionGroup } from './hooks/use_resolution_group';

const mockGroup: ResolutionGroup = {
  target: {
    'entity.name': 'alice',
    'entity.id': 'alice-id',
    'entity.source': 'logs-okta',
    'entity.risk.calculated_score_norm': 75,
    'entity.relationships.resolution.risk.calculated_score_norm': 80,
  },
  aliases: [
    {
      'entity.name': 'alice-azure',
      'entity.id': 'alice-azure-id',
      'entity.source': 'logs-azure',
      'entity.risk.calculated_score_norm': 60,
    },
  ],
  group_size: 2,
};

describe('ResolutionGroupTable', () => {
  it('renders table with target and alias rows', () => {
    const { getByTestId, getByText } = render(
      <TestProviders>
        <ResolutionGroupTable group={mockGroup} isLoading={false} targetEntityId="alice-id" />
      </TestProviders>
    );

    expect(getByTestId(RESOLUTION_GROUP_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByText('alice')).toBeInTheDocument();
    expect(getByText('alice-azure')).toBeInTheDocument();
  });

  it('shows target entity icon next to target entity name', () => {
    const { container } = render(
      <TestProviders>
        <ResolutionGroupTable group={mockGroup} isLoading={false} targetEntityId="alice-id" />
      </TestProviders>
    );

    const aggregateIcon = container.querySelector('[data-euiicon-type="aggregate"]');
    expect(aggregateIcon).toBeInTheDocument();
  });

  it('shows empty state when group is null', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ResolutionGroupTable group={null} isLoading={false} />
      </TestProviders>
    );

    expect(getByTestId(RESOLUTION_EMPTY_STATE_TEST_ID)).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading', () => {
    const { container } = render(
      <TestProviders>
        <ResolutionGroupTable group={null} isLoading />
      </TestProviders>
    );

    expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });

  it('shows actions as leading column with expand and delete buttons', () => {
    const onRemove = jest.fn();
    const onExpand = jest.fn();
    const { getAllByLabelText, container } = render(
      <TestProviders>
        <ResolutionGroupTable
          group={mockGroup}
          isLoading={false}
          showActions
          onRemoveEntity={onRemove}
          onEntityNameClick={onExpand}
          targetEntityId="alice-id"
          currentEntityId="alice-id"
        />
      </TestProviders>
    );

    const expandButtons = getAllByLabelText(/open entity details/i);
    const removeButtons = getAllByLabelText(/remove from resolution group/i);
    expect(expandButtons).toHaveLength(2);
    expect(removeButtons).toHaveLength(2);

    // Actions column should be first — check first header cell
    const headers = container.querySelectorAll('th');
    expect(headers[0]?.textContent).toContain('Actions');
  });

  it('calls onRemoveEntity when delete button clicked on alias', () => {
    const onRemove = jest.fn();
    const { getAllByLabelText } = render(
      <TestProviders>
        <ResolutionGroupTable
          group={mockGroup}
          isLoading={false}
          showActions
          onRemoveEntity={onRemove}
          targetEntityId="alice-id"
        />
      </TestProviders>
    );

    const removeButtons = getAllByLabelText(/remove from resolution group/i);
    const aliasButton = removeButtons.find((btn) => !btn.hasAttribute('disabled'));
    expect(aliasButton).toBeDefined();
    fireEvent.click(aliasButton!);
    expect(onRemove).toHaveBeenCalledWith('alice-azure-id');
  });

  it('disables expand button for current entity', () => {
    const onExpand = jest.fn();
    const { getAllByLabelText } = render(
      <TestProviders>
        <ResolutionGroupTable
          group={mockGroup}
          isLoading={false}
          showActions
          onEntityNameClick={onExpand}
          targetEntityId="alice-id"
          currentEntityId="alice-id"
        />
      </TestProviders>
    );

    const expandButtons = getAllByLabelText(/open entity details/i);
    const currentEntityButton = expandButtons[0];
    expect(currentEntityButton).toBeDisabled();
  });

  it('does not render name links when showActions is true', () => {
    const onExpand = jest.fn();
    const { getByText } = render(
      <TestProviders>
        <ResolutionGroupTable
          group={mockGroup}
          isLoading={false}
          showActions
          onEntityNameClick={onExpand}
          targetEntityId="alice-id"
        />
      </TestProviders>
    );

    const aliceName = getByText('alice');
    expect(aliceName.closest('a')).toBeNull();
  });

  it('renders entity names as links when onEntityNameClick provided without showActions', () => {
    const onClick = jest.fn();
    const { getByText } = render(
      <TestProviders>
        <ResolutionGroupTable
          group={mockGroup}
          isLoading={false}
          targetEntityId="alice-id"
          onEntityNameClick={onClick}
        />
      </TestProviders>
    );

    const aliceLink = getByText('alice');
    fireEvent.click(aliceLink);
    expect(onClick).toHaveBeenCalledWith(mockGroup.target);
  });

  it('renders risk scores as badges', () => {
    const { container } = render(
      <TestProviders>
        <ResolutionGroupTable group={mockGroup} isLoading={false} targetEntityId="alice-id" />
      </TestProviders>
    );

    const badges = container.querySelectorAll('.euiBadge');
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it('shows column headers with correct names', () => {
    const { getByText } = render(
      <TestProviders>
        <ResolutionGroupTable group={mockGroup} isLoading={false} targetEntityId="alice-id" />
      </TestProviders>
    );

    expect(getByText('Entity name')).toBeInTheDocument();
    expect(getByText('Entity ID')).toBeInTheDocument();
    expect(getByText('Data source')).toBeInTheDocument();
    expect(getByText('Risk score')).toBeInTheDocument();
  });
});
