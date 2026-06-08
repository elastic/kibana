/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Status } from './status';
import { TestProviders } from '../../../common/mock';
import { useAttackDetailsContext } from '../context';

jest.mock('../context');

jest.mock('../../../flyout_v2/attack/main/components/status', () => ({
  Status: ({
    hit,
    onAttackUpdated,
  }: {
    hit: { id: string; raw: { _id?: string } };
    onAttackUpdated: () => void;
  }) => (
    <div data-test-subj="v2-status">
      <span data-test-subj="v2-status-hit-id">{String(hit.id)}</span>
      <button type="button" data-test-subj="v2-status-update-btn" onClick={onAttackUpdated}>
        {'update'}
      </button>
    </div>
  ),
}));

const mockSearchHit = {
  _id: 'attack-id',
  _index: '.alerts-security.alerts-default',
  fields: {
    'kibana.alert.workflow_status': ['open'],
  },
};

const mockRefetch = jest.fn();

describe('<Status /> (legacy context bridge)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAttackDetailsContext as jest.Mock).mockReturnValue({
      searchHit: mockSearchHit,
      refetch: mockRefetch,
    });
  });

  test('renders the v2 Status component', () => {
    render(
      <TestProviders>
        <Status />
      </TestProviders>
    );
    expect(screen.getByTestId('v2-status')).toBeInTheDocument();
  });

  test('passes attackId from searchHit to v2 Status via hit', () => {
    render(
      <TestProviders>
        <Status />
      </TestProviders>
    );
    expect(screen.getByTestId('v2-status-hit-id')).toHaveTextContent('attack-id');
  });

  test('passes refetch as onAttackUpdated to v2 Status', async () => {
    render(
      <TestProviders>
        <Status />
      </TestProviders>
    );
    screen.getByTestId('v2-status-update-btn').click();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
