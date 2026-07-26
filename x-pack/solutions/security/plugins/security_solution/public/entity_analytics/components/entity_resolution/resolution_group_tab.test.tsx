/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { ResolutionGroupTab } from './resolution_group_tab';
import { RESOLUTION_GROUP_TAB_CONTENT_TEST_ID, CONFIRM_RESOLUTION_MODAL_TEST_ID } from './test_ids';
import { useResolutionGroup } from './hooks/use_resolution_group';
import { useLinkEntities } from './hooks/use_link_entities';
import { useUnlinkEntities } from './hooks/use_unlink_entities';
import { useSearchEntities } from './hooks/use_search_entities';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

jest.mock('./hooks/use_resolution_group');
jest.mock('./hooks/use_link_entities');
jest.mock('./hooks/use_unlink_entities');
jest.mock('./hooks/use_search_entities');
jest.mock('../../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));
jest.mock('../../../common/hooks/use_app_toasts');

const mockUseResolutionGroup = useResolutionGroup as jest.Mock;
const mockUseLinkEntities = useLinkEntities as jest.Mock;
const mockUseUnlinkEntities = useUnlinkEntities as jest.Mock;
const mockUseSearchEntities = useSearchEntities as jest.Mock;

const mockFetch = jest.fn();
const mockAddError = jest.fn();
const mockLinkMutate = jest.fn();
const mockUnlinkMutate = jest.fn();

const existingGroup = {
  target: { 'entity.name': 'alice', 'entity.id': 'alice-id' },
  aliases: [{ 'entity.name': 'alice-azure', 'entity.id': 'alice-azure-id' }],
  group_size: 2,
};

const searchResults = [
  { 'entity.name': 'bob', 'entity.id': 'bob-id', 'entity.source': 'logs-azure' },
];

describe('ResolutionGroupTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { http: { fetch: mockFetch } } });
    (useAppToasts as jest.Mock).mockReturnValue({ addError: mockAddError });
    mockUseLinkEntities.mockReturnValue({ mutate: mockLinkMutate, isLoading: false });
    mockUseUnlinkEntities.mockReturnValue({ mutate: mockUnlinkMutate, isLoading: false });
    mockUseSearchEntities.mockReturnValue({
      data: { records: searchResults, total: 1 },
      isLoading: false,
    });
  });

  it('renders group table and add entities section', () => {
    mockUseResolutionGroup.mockReturnValue({ data: existingGroup, isLoading: false });

    const { getByTestId, getAllByText, getByText } = render(
      <TestProviders>
        <ResolutionGroupTab entityId="alice-id" entityType="user" scopeId="test-scope" />
      </TestProviders>
    );

    expect(getByTestId(RESOLUTION_GROUP_TAB_CONTENT_TEST_ID)).toBeInTheDocument();
    // 'alice' appears in entity row + summary row
    expect(getAllByText('alice').length).toBeGreaterThanOrEqual(1);
    expect(getByText('bob')).toBeInTheDocument();
  });

  it('adds entity to existing group — calls linkEntities directly', async () => {
    mockUseResolutionGroup.mockReturnValue({ data: existingGroup, isLoading: false });
    // Pre-flight: entity has no group
    mockFetch.mockResolvedValueOnce({ target: {}, aliases: [], group_size: 1 });

    const { getAllByLabelText } = render(
      <TestProviders>
        <ResolutionGroupTab entityId="alice-id" entityType="user" scopeId="test-scope" />
      </TestProviders>
    );

    const addButtons = getAllByLabelText(/add to resolution group/i);
    fireEvent.click(addButtons[0]);

    await waitFor(() => {
      expect(mockLinkMutate).toHaveBeenCalledWith(
        { target_id: 'alice-id', entity_ids: ['bob-id'] },
        expect.objectContaining({ onSettled: expect.any(Function) })
      );
    });
  });

  it('adds entity with no existing group — opens confirmation modal', async () => {
    // group_size 1 means standalone entity (no group yet)
    const standaloneGroup = {
      target: { 'entity.name': 'alice', 'entity.id': 'alice-id' },
      aliases: [],
      group_size: 1,
    };
    mockUseResolutionGroup.mockReturnValue({ data: standaloneGroup, isLoading: false });
    // Pre-flight: new entity also standalone
    mockFetch.mockResolvedValueOnce({ target: {}, aliases: [], group_size: 1 });

    const { getAllByLabelText, findByTestId } = render(
      <TestProviders>
        <ResolutionGroupTab entityId="alice-id" entityType="user" scopeId="test-scope" />
      </TestProviders>
    );

    const addButtons = getAllByLabelText(/add to resolution group/i);
    fireEvent.click(addButtons[0]);

    const modal = await findByTestId(CONFIRM_RESOLUTION_MODAL_TEST_ID);
    expect(modal).toBeInTheDocument();
  });

  it('pre-flight check shows error toast if entity already has aliases', async () => {
    mockUseResolutionGroup.mockReturnValue({ data: existingGroup, isLoading: false });
    // Pre-flight: entity has its own group (group_size > 1)
    mockFetch.mockResolvedValueOnce({
      target: { 'entity.id': 'bob-id' },
      aliases: [{ 'entity.id': 'bob-alias' }],
      group_size: 2,
    });

    const { getAllByLabelText } = render(
      <TestProviders>
        <ResolutionGroupTab entityId="alice-id" entityType="user" scopeId="test-scope" />
      </TestProviders>
    );

    const addButtons = getAllByLabelText(/add to resolution group/i);
    fireEvent.click(addButtons[0]);

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalled();
      expect(mockLinkMutate).not.toHaveBeenCalled();
    });
  });

  it('removes entity — calls unlinkEntities', () => {
    mockUseResolutionGroup.mockReturnValue({ data: existingGroup, isLoading: false });

    const { getAllByLabelText } = render(
      <TestProviders>
        <ResolutionGroupTab entityId="alice-id" entityType="user" scopeId="test-scope" />
      </TestProviders>
    );

    const removeButtons = getAllByLabelText(/remove from resolution group/i);
    // Find the non-disabled remove button (alias row)
    const aliasButton = removeButtons.find((btn) => !btn.hasAttribute('disabled'));
    expect(aliasButton).toBeDefined();
    fireEvent.click(aliasButton!);
    expect(mockUnlinkMutate).toHaveBeenCalledWith(
      { entity_ids: ['alice-azure-id'] },
      expect.objectContaining({ onSettled: expect.any(Function) })
    );
  });

  it('confirm modal submit calls link mutation', async () => {
    const standaloneGroup = {
      target: { 'entity.name': 'alice', 'entity.id': 'alice-id' },
      aliases: [],
      group_size: 1,
    };
    mockUseResolutionGroup.mockReturnValue({ data: standaloneGroup, isLoading: false });
    mockFetch.mockResolvedValueOnce({ target: {}, aliases: [], group_size: 1 });

    const { getAllByLabelText, findByRole } = render(
      <TestProviders>
        <ResolutionGroupTab entityId="alice-id" entityType="user" scopeId="test-scope" />
      </TestProviders>
    );

    // Open modal
    const addButtons = getAllByLabelText(/add to resolution group/i);
    fireEvent.click(addButtons[0]);

    // Confirm with default selection (current_as_target)
    const confirmButton = await findByRole('button', { name: /confirm resolution/i });
    fireEvent.click(confirmButton);

    expect(mockLinkMutate).toHaveBeenCalledWith(
      { target_id: 'alice-id', entity_ids: ['bob-id'] },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });
});
