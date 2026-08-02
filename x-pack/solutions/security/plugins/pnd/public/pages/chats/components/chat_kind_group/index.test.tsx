/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import { renderWithPndProviders } from '../../../../components/test_utils/render_with_pnd_providers';
import type { ChatGroup } from '../../helpers/nest_chat_groups';
import { ChatKindGroup } from '.';

const groups: ChatGroup[] = [
  {
    children: [
      {
        actionLabel: 'Confirm containment',
        caseId: 'ad-1',
        description: 'Contain host-1',
        id: 'thread-1',
        title: 'Confirm containment?',
      },
    ],
    parent: {
      id: 'incident-1',
      summary: 'ad-1',
      title: 'Credential dumping',
    },
    parentConversation: {
      correlationId: 'ad-1',
      createdAt: '2026-08-02T00:00:00.000Z',
      id: 'incident-1',
      kind: 'incident',
      title: 'Credential dumping',
      updatedAt: '2026-08-02T01:00:00.000Z',
    },
  },
];

const defaultProps = {
  groups,
  label: 'Incidents',
  onChildApprovalRequest: jest.fn(),
  onOpenChat: jest.fn(),
  onOpenParent: jest.fn(),
  onPageClick: jest.fn(),
  onSelectChild: jest.fn(),
  page: 1,
  paginationAriaLabel: 'Incidents pages',
  sectionId: 'incident',
  total: 1,
};

describe('ChatKindGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the parent as a thread group header', () => {
    renderWithPndProviders(<ChatKindGroup {...defaultProps} />);

    expect(screen.getByTestId('pndQueueThreadGroupHeader')).toHaveTextContent('Credential dumping');
  });

  it('keeps HITL actions on nested children', () => {
    renderWithPndProviders(<ChatKindGroup {...defaultProps} />);

    expect(screen.getByTestId('pndQueueThreadGroupChildPrimaryAction')).toHaveTextContent(
      'Confirm containment'
    );
  });

  it('renders no type badge on the nested group', () => {
    renderWithPndProviders(<ChatKindGroup {...defaultProps} />);

    expect(screen.queryByText('Incident')).not.toBeInTheDocument();
  });

  it('does not paginate a single page', () => {
    renderWithPndProviders(<ChatKindGroup {...defaultProps} />);

    expect(screen.queryByTestId('pndChatsKindGroupPagination-incident')).not.toBeInTheDocument();
  });

  it('pages independently when the kind has more than one page', () => {
    renderWithPndProviders(<ChatKindGroup {...defaultProps} total={11} />);

    fireEvent.click(screen.getByRole('button', { name: 'Page 2 of 2' }));

    expect(defaultProps.onPageClick).toHaveBeenCalledWith(2);
  });

  it('renders nothing when the kind has no conversations', () => {
    const { container } = renderWithPndProviders(<ChatKindGroup {...defaultProps} total={0} />);

    expect(container).toBeEmptyDOMElement();
  });
});
