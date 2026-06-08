/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { Assignees } from './assignees';
import { TestProviders } from '../../../common/mock';
import { useAttackDetailsContext } from '../context';

jest.mock('../context');

jest.mock('../../../flyout_v2/attack/main/components/assignees', () => ({
  Assignees: ({
    hit,
    onAttackUpdated,
  }: {
    hit: { id: string; raw: { _id?: string } };
    onAttackUpdated: () => void;
  }) => (
    <div data-test-subj="v2-assignees">
      <span data-test-subj="v2-assignees-hit-id">{String(hit.id)}</span>
      <button type="button" data-test-subj="v2-assignees-update-btn" onClick={onAttackUpdated}>
        {'update'}
      </button>
    </div>
  ),
}));

const mockSearchHit = {
  _id: 'attack-123',
  _index: '.alerts-security.alerts-default',
  fields: {
    'kibana.alert.workflow_assignee_ids': ['uid-1'],
    'kibana.alert.attack_discovery.alert_ids': ['alert-1', 'alert-2'],
  },
};

const mockRefetch = jest.fn();

describe('<Assignees /> (legacy context bridge)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAttackDetailsContext as jest.Mock).mockReturnValue({
      searchHit: mockSearchHit,
      refetch: mockRefetch,
    });
  });

  it('renders the v2 Assignees component', () => {
    render(
      <TestProviders>
        <Assignees />
      </TestProviders>
    );
    expect(screen.getByTestId('v2-assignees')).toBeInTheDocument();
  });

  it('passes attackId from searchHit to v2 Assignees via hit', () => {
    render(
      <TestProviders>
        <Assignees />
      </TestProviders>
    );
    expect(screen.getByTestId('v2-assignees-hit-id')).toHaveTextContent('attack-123');
  });

  it('passes refetch as onAttackUpdated to v2 Assignees', () => {
    render(
      <TestProviders>
        <Assignees />
      </TestProviders>
    );
    screen.getByTestId('v2-assignees-update-btn').click();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
