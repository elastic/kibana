/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser/attachments';

import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { AttackDiscoveryMarkdownFormatter } from '../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';
import {
  ATTACK_DISCOVERY_INLINE_DETAILS_TEST_ID,
  ATTACK_DISCOVERY_INLINE_SCOPE_ID,
  ATTACK_DISCOVERY_INLINE_SUMMARY_TEST_ID,
  AttackDiscoveryInlineContent,
  createAttackDiscoveryAttachmentDefinition,
  registerAttackDiscoveryAttachment,
  type AttackDiscoveryAttachment,
} from './attack_discovery_attachment';

jest.mock('../../../attack_discovery/pages/results/attack_discovery_markdown_formatter', () => ({
  AttackDiscoveryMarkdownFormatter: jest.fn(({ markdown }: { markdown: string }) => (
    <div data-test-subj="attackDiscoveryMarkdownFormatter">{markdown}</div>
  )),
}));

const mockFormatter = AttackDiscoveryMarkdownFormatter as jest.MockedFunction<
  typeof AttackDiscoveryMarkdownFormatter
>;

const makeAttachment = (
  data: AttackDiscoveryAttachment['data'] = {}
): AttackDiscoveryAttachment => ({
  data,
  id: 'attack-discovery',
  type: SecurityAgentBuilderAttachments.attackDiscovery,
});

const renderInline = (data: AttackDiscoveryAttachment['data']) =>
  render(<AttackDiscoveryInlineContent attachment={makeAttachment(data)} isSidebar={false} />);

describe('createAttackDiscoveryAttachmentDefinition', () => {
  it('labels the attachment with the discovery title', () => {
    const definition = createAttackDiscoveryAttachmentDefinition();

    expect(definition.getLabel(makeAttachment({ title: 'Lateral movement' }))).toBe(
      'Lateral movement'
    );
  });

  it('falls back to a default label when the title is missing', () => {
    const definition = createAttackDiscoveryAttachmentDefinition();

    expect(definition.getLabel(makeAttachment({}))).toBe('Attack Discovery');
  });

  it('uses the sparkles icon', () => {
    const definition = createAttackDiscoveryAttachmentDefinition();

    expect(definition.getIcon?.()).toBe('sparkles');
  });

  it('renders inline content through AttackDiscoveryInlineContent', () => {
    const definition = createAttackDiscoveryAttachmentDefinition();
    const element = definition.renderInlineContent?.({
      attachment: makeAttachment({ details_markdown: 'd', summary_markdown: 's' }),
      isSidebar: false,
    }) as React.ReactElement;

    expect(element.type).toBe(AttackDiscoveryInlineContent);
  });

  it('reuses AttackDiscoveryInlineContent for the conversation details flyout', () => {
    const definition = createAttackDiscoveryAttachmentDefinition();
    const element = definition.renderConversationDetailsContent?.({
      attachment: makeAttachment({ details_markdown: 'd', summary_markdown: 's' }),
    }) as React.ReactElement;

    expect(element.type).toBe(AttackDiscoveryInlineContent);
  });
});

describe('registerAttackDiscoveryAttachment', () => {
  it('registers the security.attack_discovery attachment type', () => {
    const addAttachmentType = jest.fn();
    const attachments = { addAttachmentType } as unknown as AttachmentServiceStartContract;

    registerAttackDiscoveryAttachment({ attachments });

    expect(addAttachmentType).toHaveBeenCalledWith(
      SecurityAgentBuilderAttachments.attackDiscovery,
      expect.objectContaining({
        getIcon: expect.any(Function),
        getLabel: expect.any(Function),
        renderInlineContent: expect.any(Function),
      })
    );
  });
});

describe('AttackDiscoveryInlineContent', () => {
  const summaryMarkdown = 'Summary of the attack';
  const detailsMarkdown = 'Details of the attack';
  const alertIds = ['alert-1', 'alert-2'];

  beforeEach(() => {
    mockFormatter.mockClear();
  });

  it('renders the summary markdown before the details markdown', () => {
    renderInline({
      alert_ids: alertIds,
      details_markdown: detailsMarkdown,
      summary_markdown: summaryMarkdown,
      title: 'Lateral movement',
    });

    const summary = screen.getByTestId(ATTACK_DISCOVERY_INLINE_SUMMARY_TEST_ID);
    const details = screen.getByTestId(ATTACK_DISCOVERY_INLINE_DETAILS_TEST_ID);

    expect(summary.compareDocumentPosition(details)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('passes alert_ids to both formatters', () => {
    renderInline({
      alert_ids: alertIds,
      details_markdown: detailsMarkdown,
      summary_markdown: summaryMarkdown,
    });

    expect(mockFormatter.mock.calls.map(([props]) => props.alertIds)).toEqual([alertIds, alertIds]);
  });

  it('uses a conversation-scoped scopeId so field-pill flyouts do not collide with the Attacks table', () => {
    renderInline({
      details_markdown: detailsMarkdown,
      summary_markdown: summaryMarkdown,
    });

    expect(mockFormatter.mock.calls.map(([props]) => props.scopeId)).toEqual([
      ATTACK_DISCOVERY_INLINE_SCOPE_ID,
      ATTACK_DISCOVERY_INLINE_SCOPE_ID,
    ]);
  });

  it('keeps field pills enabled', () => {
    renderInline({
      details_markdown: detailsMarkdown,
      summary_markdown: summaryMarkdown,
    });

    expect(mockFormatter.mock.calls.map(([props]) => props.disableActions)).toEqual([false, false]);
  });

  it('renders summary markdown through the Attack Discovery formatter', () => {
    renderInline({
      details_markdown: detailsMarkdown,
      summary_markdown: summaryMarkdown,
    });

    expect(mockFormatter.mock.calls[0][0].markdown).toBe(summaryMarkdown);
  });

  it('renders details markdown through the Attack Discovery formatter', () => {
    renderInline({
      details_markdown: detailsMarkdown,
      summary_markdown: summaryMarkdown,
    });

    expect(mockFormatter.mock.calls[1][0].markdown).toBe(detailsMarkdown);
  });
});
