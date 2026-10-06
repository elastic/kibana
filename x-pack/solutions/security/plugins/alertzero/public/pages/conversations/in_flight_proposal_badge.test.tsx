/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { useIsApprovingProposal, useIsDecliningProposal } from '@kbn/proposals-plugin/public';
import { InFlightProposalBadge } from './in_flight_proposal_badge';

jest.mock('@kbn/proposals-plugin/public', () => ({
  useIsApprovingProposal: jest.fn(),
  useIsDecliningProposal: jest.fn(),
}));

const mockIsApproving = useIsApprovingProposal as jest.MockedFunction<
  typeof useIsApprovingProposal
>;
const mockIsDeclining = useIsDecliningProposal as jest.MockedFunction<
  typeof useIsDecliningProposal
>;

describe('InFlightProposalBadge', () => {
  beforeEach(() => {
    mockIsApproving.mockReturnValue(false);
    mockIsDeclining.mockReturnValue(false);
  });

  it('renders nothing when no decision is in flight', () => {
    const { container } = renderWithKibanaRenderContext(<InFlightProposalBadge proposalId="p1" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the Applying badge while approving, scoped to the proposal id', () => {
    mockIsApproving.mockReturnValue(true);

    renderWithKibanaRenderContext(<InFlightProposalBadge proposalId="p1" />);

    expect(screen.getByText('Applying')).toBeInTheDocument();
    expect(mockIsApproving).toHaveBeenCalledWith('p1');
    expect(mockIsDeclining).toHaveBeenCalledWith('p1');
  });

  it('shows the Declining badge while declining', () => {
    mockIsDeclining.mockReturnValue(true);

    renderWithKibanaRenderContext(<InFlightProposalBadge proposalId="p1" />);

    expect(screen.getByText('Declining')).toBeInTheDocument();
  });
});
