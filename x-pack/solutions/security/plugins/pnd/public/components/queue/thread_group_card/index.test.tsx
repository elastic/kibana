/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import type { QueueEvent, QueueParent } from '../types';
import { renderWithPndProviders } from '../../test_utils/render_with_pnd_providers';
import { ThreadGroupCard } from '.';

const parent: QueueParent = {
  id: 'investigation-1',
  riskScore: 94,
  summary: 'Credential dumping chained across three hosts.',
  title: 'Credential dumping on host-1',
};

const child = ({ id, title }: { id: string; title: string }): QueueEvent => ({
  actionIcon: 'lock',
  actionLabel: 'Confirm containment',
  actionTone: 'danger',
  caseId: id,
  description: `Contain ${title}`,
  gateId: 'incident_contained',
  id,
  recommendedAction: 'contain',
  reversible: false,
  riskScore: 80,
  threadConversationId: `thread-${id}`,
  title,
});

const pending = [
  child({ id: 'child-1', title: 'Revoke sessions on host-1' }),
  child({ id: 'child-2', title: 'Isolate Sales-NAS' }),
  child({ id: 'child-3', title: 'Disable the leaked key' }),
  child({ id: 'child-4', title: 'Block the egress range' }),
];

const resolved: QueueEvent[] = [
  {
    ...child({ id: 'child-resolved', title: 'Quarantine the laptop' }),
    actionLabel: undefined,
  },
];

const defaultProps = {
  onChildApprovalRequest: jest.fn(),
  onOpenParent: jest.fn(),
  onSelectChild: jest.fn(),
  parent,
  pendingChildren: pending,
  resolvedChildren: resolved,
};

describe('ThreadGroupCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the parent conversation as the group header', () => {
    renderWithPndProviders(<ThreadGroupCard {...defaultProps} />);

    expect(screen.getByTestId('pndQueueThreadGroupHeader')).toHaveTextContent(parent.title);
  });

  it('summarizes the parent in the header', () => {
    renderWithPndProviders(<ThreadGroupCard {...defaultProps} />);

    expect(screen.getByTestId('pndQueueThreadGroupHeader')).toHaveTextContent(parent.summary);
  });

  it('opens the parent from the header, which is lateral navigation only', () => {
    renderWithPndProviders(<ThreadGroupCard {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndQueueThreadGroupHeader'));

    expect(defaultProps.onOpenParent).toHaveBeenCalledWith(parent.id);
  });

  it('opens the parent on Enter from the header', () => {
    renderWithPndProviders(<ThreadGroupCard {...defaultProps} />);

    fireEvent.keyDown(screen.getByTestId('pndQueueThreadGroupHeader'), { key: 'Enter' });

    expect(defaultProps.onOpenParent).toHaveBeenCalledWith(parent.id);
  });

  it('does not request approval from the header', () => {
    renderWithPndProviders(<ThreadGroupCard {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndQueueThreadGroupHeader'));

    expect(defaultProps.onChildApprovalRequest).not.toHaveBeenCalled();
  });

  it('renders no type badge on the header', () => {
    renderWithPndProviders(<ThreadGroupCard {...defaultProps} />);

    expect(
      ['Investigation', 'Sub-investigation', 'Incident', 'Parent · Investigation'].some(
        (label) => screen.queryByText(label) != null
      )
    ).toBe(false);
  });

  it('keeps HITL actions on pending children', () => {
    renderWithPndProviders(<ThreadGroupCard {...defaultProps} />);

    expect(screen.getAllByTestId('pndQueueThreadGroupChildPrimaryAction')[0]).toHaveTextContent(
      'Confirm containment'
    );
  });

  it('requests approval from a child action without opening the parent', () => {
    renderWithPndProviders(<ThreadGroupCard {...defaultProps} />);

    fireEvent.click(screen.getAllByTestId('pndQueueThreadGroupChildPrimaryAction')[0]);

    expect(defaultProps.onChildApprovalRequest).toHaveBeenCalledWith(pending[0]);
    expect(defaultProps.onOpenParent).not.toHaveBeenCalled();
  });

  it('stops keydown on a child action so it cannot activate the child row', () => {
    renderWithPndProviders(<ThreadGroupCard {...defaultProps} />);

    fireEvent.keyDown(screen.getAllByTestId('pndQueueThreadGroupChildPrimaryAction')[0], {
      key: ' ',
    });

    expect(defaultProps.onSelectChild).not.toHaveBeenCalled();
  });

  it('folds after three children', () => {
    renderWithPndProviders(<ThreadGroupCard {...defaultProps} />);

    expect(screen.getAllByTestId('pndQueueThreadGroupChildRow')).toHaveLength(3);
  });

  it('offers a +N more control for the folded children', () => {
    renderWithPndProviders(<ThreadGroupCard {...defaultProps} />);

    expect(screen.getByTestId('pndQueueThreadGroupShowMore')).toHaveTextContent('+2 more');
  });

  it('reveals the folded children when +N more is clicked', () => {
    renderWithPndProviders(<ThreadGroupCard {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndQueueThreadGroupShowMore'));

    expect(screen.getAllByTestId('pndQueueThreadGroupChildRow')).toHaveLength(4);
  });

  it('demotes resolved children in place', () => {
    renderWithPndProviders(
      <ThreadGroupCard {...defaultProps} pendingChildren={pending.slice(0, 1)} />
    );

    expect(screen.getByTestId('pndQueueThreadGroupResolvedRow')).toHaveStyle({ opacity: '0.75' });
  });

  it('renders no thinking dots on a parked child', () => {
    renderWithPndProviders(<ThreadGroupCard {...defaultProps} />);

    expect(screen.getByTestId('pndQueueThreadGroupCard')).not.toHaveTextContent('···');
  });

  it('names the header risk score for a screen reader', () => {
    renderWithPndProviders(<ThreadGroupCard {...defaultProps} />);

    expect(screen.getAllByLabelText('Risk score 94')[0]).toBeInTheDocument();
  });
});
