/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { PndConversationAttachment } from '@kbn/pnd-common';

import { renderWithPndProviders } from '../../../../../components/test_utils/render_with_pnd_providers';
import { ChatAttachment } from '.';

const attachment: PndConversationAttachment = {
  content: '## Suspicious PowerShell on host-1',
  createdAt: '2026-08-03T17:14:00.000Z',
  description: 'Attack discovery summary',
  id: 'attack-discovery-summary',
  type: 'text',
};

describe('ChatAttachment', () => {
  it('labels the attachment with its description', () => {
    renderWithPndProviders(<ChatAttachment attachment={attachment} />);

    expect(screen.getByTestId('pndChatsDetailAttachment')).toHaveTextContent(
      'Attack discovery summary'
    );
  });

  it('falls back to the id when the attachment has no description', () => {
    renderWithPndProviders(
      <ChatAttachment attachment={{ ...attachment, description: undefined }} />
    );

    expect(screen.getByTestId('pndChatsDetailAttachment')).toHaveTextContent(
      'attack-discovery-summary'
    );
  });

  it('badges what kind of attachment it is', () => {
    renderWithPndProviders(<ChatAttachment attachment={attachment} />);

    expect(screen.getByTestId('pndChatsDetailAttachmentType')).toHaveTextContent('text');
  });

  it('renders the attachment content', () => {
    renderWithPndProviders(<ChatAttachment attachment={attachment} />);

    expect(screen.getByTestId('pndChatsDetailAttachmentContent')).toHaveTextContent(
      '## Suspicious PowerShell on host-1'
    );
  });

  it('says so when there is no content to render inline, rather than rendering an empty block', () => {
    renderWithPndProviders(<ChatAttachment attachment={{ ...attachment, content: undefined }} />);

    expect(screen.getByTestId('pndChatsDetailAttachmentNoContent')).toBeInTheDocument();
  });

  it('renders no content block when there is no content', () => {
    renderWithPndProviders(<ChatAttachment attachment={{ ...attachment, content: undefined }} />);

    expect(screen.queryByTestId('pndChatsDetailAttachmentContent')).not.toBeInTheDocument();
  });

  it('renders the attachment content as text, never as markup', () => {
    renderWithPndProviders(
      <ChatAttachment attachment={{ ...attachment, content: '<img src=x onerror="alert(1)" />' }} />
    );

    expect(
      screen.getByTestId('pndChatsDetailAttachmentContent').querySelector('img')
    ).not.toBeInTheDocument();
  });
});
