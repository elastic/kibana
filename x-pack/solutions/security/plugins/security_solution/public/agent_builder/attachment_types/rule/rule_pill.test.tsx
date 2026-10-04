/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { decode } from '@kbn/rison';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { RulePill } from './rule_pill';

jest.mock('../conversation_details/pills', () => ({
  FlyoutPill: ({
    label,
    resolveDescriptor,
  }: {
    label: string;
    resolveDescriptor: () => Promise<unknown>;
  }) => {
    (
      FlyoutPill as unknown as { lastResolveDescriptor: () => Promise<unknown> }
    ).lastResolveDescriptor = resolveDescriptor;
    return (
      <button type="button" data-test-subj="flyout-pill">
        {label}
      </button>
    );
  },
  LinkPill: ({ label, href }: { label: string; href: string }) => (
    <a data-test-subj="link-pill" href={href}>
      {label}
    </a>
  ),
}));

// Grab the mocked component so we can read lastResolveDescriptor.
const { FlyoutPill } = jest.requireMock('../conversation_details/pills') as {
  FlyoutPill: jest.Mock & { lastResolveDescriptor: () => Promise<unknown> };
};

const mockGetUrlForApp = jest.fn((_, { path }: { path?: string } = {}) => path ?? '');
const application = { getUrlForApp: mockGetUrlForApp } as unknown as ApplicationStart;
const resolveSecurityCanvasContext = jest.fn();

const makeAttachment = (text: Record<string, unknown>, origin?: string): UnknownAttachment => ({
  id: 'attachment-1',
  type: 'security.rule',
  data: { text: JSON.stringify(text) },
  origin,
});

describe('RulePill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (FlyoutPill as unknown as { lastResolveDescriptor: unknown }).lastResolveDescriptor = undefined;
  });

  it('renders a flyout pill when the rule id comes from parsed text', async () => {
    render(
      <RulePill
        attachment={makeAttachment({ id: 'rule-123' })}
        application={application}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    expect(screen.getByTestId('flyout-pill')).toBeInTheDocument();
    const descriptor = await FlyoutPill.lastResolveDescriptor();
    expect(descriptor).toEqual({ kind: FLYOUT_DESCRIPTOR_KIND.rule, ruleId: 'rule-123' });
  });

  it('renders a flyout pill when the rule id comes from the origin field only', async () => {
    render(
      <RulePill
        attachment={makeAttachment({}, 'rule-from-origin')}
        application={application}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    expect(screen.getByTestId('flyout-pill')).toBeInTheDocument();
    const descriptor = await FlyoutPill.lastResolveDescriptor();
    expect(descriptor).toEqual({ kind: FLYOUT_DESCRIPTOR_KIND.rule, ruleId: 'rule-from-origin' });
  });

  it('renders a link to the management page when there is no rule id', () => {
    render(
      <RulePill
        attachment={makeAttachment({})}
        application={application}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    const link = screen.getByTestId('link-pill');
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toContain('/management');
  });

  it('link includes a searchTerm when the rule name is available', () => {
    render(
      <RulePill
        attachment={{ ...makeAttachment({}), data: { text: '{}', attachmentLabel: 'My Rule' } }}
        application={application}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    const href = screen.getByTestId('link-pill').getAttribute('href') ?? '';
    const params = new URLSearchParams(href.replace(/.*\?/, ''));
    const rulesTable = decode(params.get('rulesTable')!) as { searchTerm: string };

    expect(rulesTable.searchTerm).toBe('My Rule');
  });
});
