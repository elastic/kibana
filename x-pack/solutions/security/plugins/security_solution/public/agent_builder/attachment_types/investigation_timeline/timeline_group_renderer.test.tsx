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
import { createTimelineGroupRenderer } from './timeline_group_renderer';

jest.mock('./open_timeline_flyout_on_mount', () => ({
  InvestigationTimelineFlyoutOpener: () => null,
}));

const Renderer = createTimelineGroupRenderer({
  resolveSecurityCanvasContext: jest.fn(),
});

const event = {
  timestamp: '2026-09-11T14:23:32.488Z',
  host: 'WKSTN-RECV01',
  description: 'OUTLOOK.EXE spawned powershell.exe',
};

const timeline = (overrides: Partial<UnknownAttachment> = {}): UnknownAttachment => ({
  id: 'attachment-timeline',
  type: SecurityAgentBuilderAttachments.investigationTimeline,
  data: { events: [event] },
  ...overrides,
});

describe('createTimelineGroupRenderer', () => {
  it('renders a flyout row for a timeline attachment', () => {
    render(
      <ul>
        <Renderer attachments={[timeline()]} />
      </ul>
    );

    expect(screen.getByRole('button', { name: /^Forensic timeline/ })).toBeInTheDocument();
  });

  it('renders only the first timeline attachment', () => {
    render(
      <ul>
        <Renderer attachments={[timeline({ id: 'a' }), timeline({ id: 'b' })]} />
      </ul>
    );

    expect(screen.getAllByRole('button', { name: /^Forensic timeline/ })).toHaveLength(1);
  });

  it('renders the first timeline attachment that has events', () => {
    render(
      <ul>
        <Renderer
          attachments={[timeline({ id: 'a', data: { events: [] } }), timeline({ id: 'b' })]}
        />
      </ul>
    );

    expect(screen.getAllByRole('button', { name: /^Forensic timeline/ })).toHaveLength(1);
  });

  it('skips a timeline with no events', () => {
    render(
      <ul>
        <Renderer attachments={[timeline({ data: { events: [] } })]} />
      </ul>
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
