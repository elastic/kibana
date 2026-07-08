/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../../common/mock';
import { EntitiesDetails } from '.';
import { useAttackEntitiesLists } from './hooks/use_attack_entities_lists';
import {
  ATTACK_ENTITIES_TOOL_ERROR_TEST_ID,
  ATTACK_ENTITIES_TOOL_LOADING_TEST_ID,
  ATTACK_ENTITIES_TOOL_TEST_ID,
} from './test_ids';

jest.mock('./hooks/use_attack_entities_lists');
jest.mock('../../../shared/components/document_tools_flyout_header', () => ({
  DocumentToolsFlyoutHeader: () => <div data-test-subj="mock-document-tools-flyout-header" />,
}));
jest.mock('../../../../flyout/attack_details/left/components/attack_entity_insight_rows', () => ({
  AttackUserInsightsRow: ({
    identityFields,
  }: {
    identityFields: Record<string, string | undefined>;
  }) => (
    <div data-test-subj="mock-user-insights-row">
      {identityFields['user.name'] ?? 'unknown-user'}
    </div>
  ),
  AttackHostInsightsRow: ({
    identityFields,
  }: {
    identityFields: Record<string, string | undefined>;
  }) => (
    <div data-test-subj="mock-host-insights-row">
      {identityFields['host.name'] ?? 'unknown-host'}
    </div>
  ),
}));

const mockUseAttackEntitiesLists = useAttackEntitiesLists as jest.Mock;

const mockHit: DataTableRecord = {
  id: 'attack-1',
  raw: { _id: 'attack-1', _index: '.alerts-security.attack-discovery.alerts-default' },
  flattened: {
    _id: 'attack-1',
    '@timestamp': '2024-01-01T00:00:00.000Z',
    'kibana.alert.attack_discovery.title': 'Test attack',
  },
  isAnchor: false,
} as DataTableRecord;

const defaultEntitiesResult = {
  userEntityEntries: [],
  hostEntityEntries: [],
  loading: false,
  error: false,
};

const renderTool = ({ alertIds = ['alert-id-1', 'alert-id-2'] }: { alertIds?: string[] } = {}) =>
  render(
    <TestProviders>
      <EntitiesDetails hit={mockHit} alertIds={alertIds} />
    </TestProviders>
  );

describe('EntitiesDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAttackEntitiesLists.mockReturnValue(defaultEntitiesResult);
  });

  it('renders the header and body', () => {
    renderTool();

    expect(screen.getByTestId('mock-document-tools-flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId(ATTACK_ENTITIES_TOOL_TEST_ID)).toBeInTheDocument();
  });

  describe('loading state', () => {
    it('shows the loading skeleton when loading is true', () => {
      mockUseAttackEntitiesLists.mockReturnValue({
        ...defaultEntitiesResult,
        loading: true,
      });

      renderTool();

      expect(screen.getByTestId(ATTACK_ENTITIES_TOOL_LOADING_TEST_ID)).toBeInTheDocument();
      expect(screen.queryByTestId(ATTACK_ENTITIES_TOOL_ERROR_TEST_ID)).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows the error callout when error is true', () => {
      mockUseAttackEntitiesLists.mockReturnValue({
        ...defaultEntitiesResult,
        error: true,
      });

      renderTool();

      expect(screen.getByTestId(ATTACK_ENTITIES_TOOL_ERROR_TEST_ID)).toBeInTheDocument();
      expect(screen.queryByTestId(ATTACK_ENTITIES_TOOL_LOADING_TEST_ID)).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows the no-entities message when there are no users or hosts', () => {
      mockUseAttackEntitiesLists.mockReturnValue({
        ...defaultEntitiesResult,
        userEntityEntries: [],
        hostEntityEntries: [],
      });

      renderTool();

      expect(
        screen.getByText('Host and user information are unavailable for this attack.')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('mock-user-insights-row')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-host-insights-row')).not.toBeInTheDocument();
    });
  });

  describe('populated state', () => {
    const userEntry = {
      identityFields: { 'user.name': 'alice' },
      sampleSource: { 'user.name': 'alice' },
    };
    const hostEntry = {
      identityFields: { 'host.name': 'server-1' },
      sampleSource: { 'host.name': 'server-1' },
    };

    it('renders user rows when userEntityEntries are present', () => {
      mockUseAttackEntitiesLists.mockReturnValue({
        ...defaultEntitiesResult,
        userEntityEntries: [userEntry],
      });

      renderTool();

      expect(screen.getByTestId('mock-user-insights-row')).toBeInTheDocument();
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    it('renders host rows when hostEntityEntries are present', () => {
      mockUseAttackEntitiesLists.mockReturnValue({
        ...defaultEntitiesResult,
        hostEntityEntries: [hostEntry],
      });

      renderTool();

      expect(screen.getByTestId('mock-host-insights-row')).toBeInTheDocument();
      expect(screen.getByText('server-1')).toBeInTheDocument();
    });

    it('renders both users and hosts when both are present', () => {
      mockUseAttackEntitiesLists.mockReturnValue({
        ...defaultEntitiesResult,
        userEntityEntries: [userEntry],
        hostEntityEntries: [hostEntry],
      });

      renderTool();

      expect(screen.getByTestId('mock-user-insights-row')).toBeInTheDocument();
      expect(screen.getByTestId('mock-host-insights-row')).toBeInTheDocument();
    });

    it('entity name rows have no click handler (no-op)', () => {
      mockUseAttackEntitiesLists.mockReturnValue({
        ...defaultEntitiesResult,
        userEntityEntries: [userEntry],
        hostEntityEntries: [hostEntry],
      });

      renderTool();

      // The insight row mocks receive no onClick prop — clicking them should not throw
      const userRow = screen.getByTestId('mock-user-insights-row');
      const hostRow = screen.getByTestId('mock-host-insights-row');
      expect(userRow).toBeInTheDocument();
      expect(hostRow).toBeInTheDocument();
      // No onClick attribute wired — absence of role="button" confirms no-op
      expect(userRow.closest('[role="button"]')).toBeNull();
      expect(hostRow.closest('[role="button"]')).toBeNull();
    });
  });
});
