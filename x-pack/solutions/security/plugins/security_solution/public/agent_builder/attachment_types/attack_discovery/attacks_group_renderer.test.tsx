/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { createAttacksGroupRenderer } from './attacks_group_renderer';

jest.mock('../grouped_attachments/flyout_opener', () => ({
  GroupedAttachmentFlyoutOpener: () => null,
}));

const Renderer = createAttacksGroupRenderer({
  getSpaceId: jest.fn().mockResolvedValue('default'),
  resolveSecurityCanvasContext: jest.fn(),
});

const attack = (overrides: Partial<UnknownAttachment> = {}): UnknownAttachment => ({
  id: 'attachment-attack',
  type: SecurityAgentBuilderAttachments.attackDiscovery,
  data: { id: 'attack-1', title: 'Impossible travel — exec account' },
  ...overrides,
});

describe('createAttacksGroupRenderer', () => {
  it('renders a flyout row titled with the attack', async () => {
    render(
      <ul>
        <Renderer attachments={[attack()]} />
      </ul>
    );

    expect(await screen.findByText('Impossible travel — exec account')).toBeInTheDocument();
    expect(screen.getByText('Attack')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows an attack attached twice once', async () => {
    render(
      <ul>
        <Renderer attachments={[attack({ id: 'a' }), attack({ id: 'b' })]} />
      </ul>
    );

    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
  });

  it('skips an attack that cannot be identified', async () => {
    render(
      <ul>
        <Renderer attachments={[attack({ data: { title: 'No id' } })]} />
      </ul>
    );

    await screen.findByRole('list');
    expect(screen.queryByText('No id')).not.toBeInTheDocument();
  });
});
