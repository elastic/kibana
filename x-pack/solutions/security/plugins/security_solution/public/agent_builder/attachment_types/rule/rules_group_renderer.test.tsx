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
import { createRulesGroupRenderer } from './rules_group_renderer';

jest.mock('../grouped_attachments/flyout_opener', () => ({
  GroupedAttachmentFlyoutOpener: () => null,
}));

const getUrlForApp = jest.fn(() => '/app/security/rules/management');
const Renderer = createRulesGroupRenderer({
  application: { getUrlForApp } as never,
  resolveSecurityCanvasContext: jest.fn(),
});

const rule = (overrides: Partial<UnknownAttachment> = {}): UnknownAttachment => ({
  id: 'attachment-rule',
  type: SecurityAgentBuilderAttachments.rule,
  data: { text: '{}', attachmentLabel: 'External mailbox forwarding' },
  ...overrides,
});

describe('createRulesGroupRenderer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens the rule flyout for a saved rule', () => {
    render(
      <ul>
        <Renderer attachments={[rule({ origin: 'rule-1' })]} />
      </ul>
    );

    expect(screen.getByText('External mailbox forwarding')).toBeInTheDocument();
    expect(screen.getByText('Rule')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(getUrlForApp).not.toHaveBeenCalled();
  });

  it('links to rules management, searching the name, for a rule that is not saved', () => {
    render(
      <ul>
        <Renderer attachments={[rule()]} />
      </ul>
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '/app/security/rules/management');
    expect(getUrlForApp).toHaveBeenCalledWith(
      'securitySolutionUI',
      expect.objectContaining({
        deepLinkId: 'rules',
        path: expect.stringContaining('rulesTable='),
      })
    );
  });

  it('collapses several rules into one row linking to rules management', () => {
    render(
      <ul>
        <Renderer
          attachments={[
            rule({ id: 'a', origin: 'r1' }),
            rule({ id: 'b', origin: 'r2' }),
            rule({ id: 'c', origin: 'r2' }),
          ]}
        />
      </ul>
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('2 rules')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/app/security/rules/management');
    expect(getUrlForApp).toHaveBeenCalledWith(
      'securitySolutionUI',
      expect.objectContaining({ deepLinkId: 'rules', path: '/management' })
    );
  });

  it('shows a rule attached twice once', () => {
    render(
      <ul>
        <Renderer
          attachments={[rule({ id: 'a', origin: 'r1' }), rule({ id: 'b', origin: 'r1' })]}
        />
      </ul>
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('encodes the rule name in the rules management link', () => {
    render(
      <ul>
        <Renderer attachments={[rule({ data: { text: '{}', attachmentLabel: 'a&b#c+d' } })]} />
      </ul>
    );

    const [, { path }] = getUrlForApp.mock.calls[0] as unknown as [string, { path: string }];
    expect(path).not.toMatch(/[#+]/);
    expect(path.split('&')).toHaveLength(1);
  });

  it('counts unsaved rules that share a name separately', () => {
    render(
      <ul>
        <Renderer attachments={[rule({ id: 'a' }), rule({ id: 'b' })]} />
      </ul>
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('2 rules')).toBeInTheDocument();
  });
});
