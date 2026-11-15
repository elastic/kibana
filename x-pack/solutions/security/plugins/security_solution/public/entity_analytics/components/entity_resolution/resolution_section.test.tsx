/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { EntityType } from '../../../../common/entity_analytics/types';
import { ResolutionSection } from './resolution_section';
import { RESOLUTION_SECTION_TEST_ID, RESOLUTION_EMPTY_STATE_TEST_ID } from './test_ids';
import { useResolutionGroup } from './hooks/use_resolution_group';

jest.mock('./hooks/use_resolution_group');
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: jest.fn() }),
}));

const mockUseResolutionGroup = useResolutionGroup as jest.Mock;

describe('ResolutionSection', () => {
  const defaultProps = {
    entityId: 'alice-id',
    entityType: EntityType.user,
    scopeId: 'test-scope',
    openDetailsPanel: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders accordion with resolution group table', () => {
    mockUseResolutionGroup.mockReturnValue({
      data: {
        target: { 'entity.name': 'alice', 'entity.id': 'alice-id' },
        aliases: [{ 'entity.name': 'alice-azure', 'entity.id': 'alice-azure-id' }],
        group_size: 2,
      },
      isLoading: false,
    });

    const { getByTestId, getByText } = render(
      <TestProviders>
        <ResolutionSection {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId(RESOLUTION_SECTION_TEST_ID)).toBeInTheDocument();
    expect(getByText('alice')).toBeInTheDocument();
  });

  describe('target entity link', () => {
    const group = {
      target: { 'entity.name': 'alice', 'entity.id': 'alice-id' },
      aliases: [{ 'entity.name': 'alice-azure', 'entity.id': 'alice-azure-id' }],
      group_size: 2,
    };

    beforeEach(() => {
      mockUseResolutionGroup.mockReturnValue({ data: group, isLoading: false });
    });

    it('keeps the open entity as plain text in single mode', () => {
      const onShowEntity = jest.fn();
      const { getByText } = render(
        <TestProviders>
          <ResolutionSection {...defaultProps} onShowEntity={onShowEntity} />
        </TestProviders>
      );

      expect(getByText('alice').closest('a, button')).toBeNull();
      fireEvent.click(getByText('alice'));
      expect(onShowEntity).not.toHaveBeenCalled();
    });

    it('links the target entity in resolved mode and opens it in single mode', () => {
      const onShowEntity = jest.fn();
      const { getByText } = render(
        <TestProviders>
          <ResolutionSection {...defaultProps} mode="resolved" onShowEntity={onShowEntity} />
        </TestProviders>
      );

      fireEvent.click(getByText('alice'));

      expect(onShowEntity).toHaveBeenCalledTimes(1);
      const [params] = onShowEntity.mock.calls[0];
      expect(params).toEqual({ engineType: 'user', entityId: 'alice-id', entityName: 'alice' });
      // No `mode` is forwarded, so the target opens as a single entity rather than as its group.
      expect(params).not.toHaveProperty('mode');
    });
  });

  it('shows loading spinner while loading', () => {
    mockUseResolutionGroup.mockReturnValue({ data: undefined, isLoading: true });

    const { container } = render(
      <TestProviders>
        <ResolutionSection {...defaultProps} />
      </TestProviders>
    );

    expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });

  it('shows empty state when no resolution group', () => {
    mockUseResolutionGroup.mockReturnValue({
      data: { target: { 'entity.id': 'alice-id' }, aliases: [], group_size: 1 },
      isLoading: false,
    });

    const { getByTestId } = render(
      <TestProviders>
        <ResolutionSection {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId(RESOLUTION_EMPTY_STATE_TEST_ID)).toBeInTheDocument();
  });
});
