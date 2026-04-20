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
    const { getByTestId, getByText, getAllByText } = render(
      <TestProviders>
        <ResolutionGroupTable group={mockGroup} isLoading={false} targetEntityId="alice-id" />
      </TestProviders>
    );

    expect(getByTestId(RESOLUTION_GROUP_TABLE_TEST_ID)).toBeInTheDocument();
    // 'alice' appears in both entity row and summary row, so use getAllByText
    expect(getAllByText('alice').length).toBeGreaterThanOrEqual(1);
    expect(getByText('alice-azure')).toBeInTheDocument();
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

  it('shows remove buttons when showActions is true', () => {
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
    // 2 entity rows + 1 summary row (summary renders null for actions, but we get buttons for the 2 entity rows)
    expect(removeButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onRemoveEntity when remove button clicked on alias', () => {
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
    // The second button is for the alias row (first is target, which is disabled)
    const aliasButton = removeButtons.find((btn) => !btn.hasAttribute('disabled'));
    expect(aliasButton).toBeDefined();
    fireEvent.click(aliasButton!);
    expect(onRemove).toHaveBeenCalledWith('alice-azure-id');
  });
});
