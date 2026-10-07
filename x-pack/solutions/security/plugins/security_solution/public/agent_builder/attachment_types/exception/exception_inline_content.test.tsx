/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { ExceptionInlineContent } from './exception_inline_content';
import type { ExceptionAttachment, ExceptionAttachmentData } from './types';

const buildAttachment = (data: ExceptionAttachmentData): ExceptionAttachment => ({
  id: 'security.exception:proposal-1',
  type: SecurityAgentBuilderAttachments.exception,
  data,
});

const renderContent = (data: ExceptionAttachmentData) =>
  render(<ExceptionInlineContent attachment={buildAttachment(data)} isSidebar={false} />);

describe('ExceptionInlineContent', () => {
  it('renders the description and every condition', () => {
    renderContent({
      name: 'Exclude maintenance host',
      description: 'Host is under maintenance',
      entries: [
        { field: 'host.name', operator: 'is', value: 'svc-01' },
        { field: 'user.name', operator: 'is_one_of', values: ['svc-patching', 'svc-backup'] },
      ],
    });

    expect(screen.getByText('Host is under maintenance')).toBeInTheDocument();
    expect(screen.getByText('host.name')).toBeInTheDocument();
    expect(screen.getByText('svc-01')).toBeInTheDocument();
    expect(screen.getByText('user.name')).toBeInTheDocument();
  });

  it('omits the description block when the proposal has none', () => {
    renderContent({
      name: 'Exclude maintenance host',
      description: '',
      entries: [{ field: 'host.name', operator: 'exists' }],
    });

    expect(screen.getByText('host.name')).toBeInTheDocument();
  });

  it('renders a value-list condition as plain text instead of a modal link', () => {
    renderContent({
      name: 'Exclude known service accounts',
      description: '',
      entries: [
        { field: 'user.name', operator: 'is_in_list', list: { id: 'users', type: 'keyword' } },
      ],
    });

    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.queryByTestId('show-value-list-modal-users')).not.toBeInTheDocument();
  });

  it('falls back to a callout when an entry is missing its operand', () => {
    renderContent({
      name: 'Broken proposal',
      description: '',
      // Rejected by the attachment's server-side schema; guards against a payload
      // written before that validation, or by a future non-validating producer.
      entries: [{ field: 'host.name', operator: 'is' }],
    });

    expect(screen.getByTestId('securityExceptionAttachmentInvalidEntries')).toBeInTheDocument();
  });
});
