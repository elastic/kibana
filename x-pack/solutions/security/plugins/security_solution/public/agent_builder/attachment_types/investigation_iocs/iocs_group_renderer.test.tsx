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
import { createIocsGroupRenderer } from './iocs_group_renderer';

jest.mock('./open_iocs_flyout_on_mount', () => ({
  InvestigationIocsFlyoutOpener: () => null,
}));

const Renderer = createIocsGroupRenderer({
  resolveSecurityCanvasContext: jest.fn(),
});

const iocs = (overrides: Partial<UnknownAttachment> = {}): UnknownAttachment => ({
  id: 'attachment-iocs',
  type: SecurityAgentBuilderAttachments.investigationIocs,
  data: { ips: [{ value: '10.0.0.8' }] },
  ...overrides,
});

describe('createIocsGroupRenderer', () => {
  it('renders a flyout row for an indicators attachment', () => {
    render(
      <ul>
        <Renderer attachments={[iocs()]} />
      </ul>
    );

    expect(screen.getByRole('button', { name: /^IOCs/ })).toBeInTheDocument();
  });

  it('renders only the first indicators attachment', () => {
    render(
      <ul>
        <Renderer attachments={[iocs({ id: 'a' }), iocs({ id: 'b' })]} />
      </ul>
    );

    expect(screen.getAllByRole('button', { name: /^IOCs/ })).toHaveLength(1);
  });

  it('skips an attachment with no indicators', () => {
    render(
      <ul>
        <Renderer attachments={[iocs({ data: { ips: [] } })]} />
      </ul>
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
