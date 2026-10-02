/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser/attachments';
import type { ISearchGeneric } from '@kbn/search-types';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';

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

const ANONYMIZED_HOST = '3d241119-f77a-454e-8ee3-d36e05a8714f';

const makeAttachment = (
  data: AttackDiscoveryAttachment['data'] = {}
): AttackDiscoveryAttachment => ({
  data,
  id: 'attack-discovery',
  type: SecurityAgentBuilderAttachments.attackDiscovery,
});

const renderInline = (data: AttackDiscoveryAttachment['data']) =>
  render(<AttackDiscoveryInlineContent attachment={makeAttachment(data)} isSidebar={false} />);

const makeDefinitionProps = () => ({
  getSpaceId: jest.fn().mockResolvedValue('default'),
  search: jest.fn() as unknown as ISearchGeneric,
  resolveSecurityCanvasContext: jest.fn() as unknown as () => Promise<SecurityCanvasEmbeddedBundle>,
});

describe('createAttackDiscoveryAttachmentDefinition', () => {
  it('labels the attachment with the discovery title', () => {
    const definition = createAttackDiscoveryAttachmentDefinition(makeDefinitionProps());

    expect(definition.getLabel(makeAttachment({ title: 'Lateral movement' }))).toBe(
      'Lateral movement'
    );
  });

  it('labels the attachment with the de-anonymized title', () => {
    const definition = createAttackDiscoveryAttachmentDefinition(makeDefinitionProps());

    expect(
      definition.getLabel(
        makeAttachment({
          replacements: { [ANONYMIZED_HOST]: 'SRVWIN04' },
          title: `Attack on ${ANONYMIZED_HOST}`,
        })
      )
    ).toBe('Attack on SRVWIN04');
  });

  it('falls back to a default label when the title is missing', () => {
    const definition = createAttackDiscoveryAttachmentDefinition(makeDefinitionProps());

    expect(definition.getLabel(makeAttachment({}))).toBe('Attack Discovery');
  });

  it('uses the sparkles icon', () => {
    const definition = createAttackDiscoveryAttachmentDefinition(makeDefinitionProps());

    expect(definition.getIcon?.()).toBe('sparkles');
  });

  it('renders inline content through AttackDiscoveryInlineContent', () => {
    const definition = createAttackDiscoveryAttachmentDefinition(makeDefinitionProps());
    const element = definition.renderInlineContent?.({
      attachment: makeAttachment({ details_markdown: 'd', summary_markdown: 's' }),
      isSidebar: false,
    }) as React.ReactElement;

    expect(element.type).toBe(AttackDiscoveryInlineContent);
  });

  it('provides renderConversationDetailsContent', () => {
    const definition = createAttackDiscoveryAttachmentDefinition(makeDefinitionProps());

    expect(definition.renderConversationDetailsContent).toBeDefined();
  });
});

describe('registerAttackDiscoveryAttachment', () => {
  it('registers the security.attack_discovery attachment type', () => {
    const addAttachmentType = jest.fn();
    const attachments = { addAttachmentType } as unknown as AttachmentServiceStartContract;

    registerAttackDiscoveryAttachment({ attachments, ...makeDefinitionProps() });

    expect(addAttachmentType).toHaveBeenCalledWith(
      SecurityAgentBuilderAttachments.attackDiscovery,
      expect.objectContaining({
        getIcon: expect.any(Function),
        getLabel: expect.any(Function),
        renderInlineContent: expect.any(Function),
        renderConversationDetailsContent: expect.any(Function),
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

  // The view and the agent insert the original values from the same replacements.
  it('renders the markdown with the original values from the replacements', () => {
    renderInline({
      details_markdown: `Details for {{ host.name ${ANONYMIZED_HOST} }}`,
      replacements: { [ANONYMIZED_HOST]: 'SRVWIN04' },
      summary_markdown: `Summary for {{ host.name ${ANONYMIZED_HOST} }}`,
    });

    expect(mockFormatter.mock.calls.map(([props]) => props.markdown)).toEqual([
      'Summary for {{ host.name SRVWIN04 }}',
      'Details for {{ host.name SRVWIN04 }}',
    ]);
  });

  it('renders the anonymized markdown when there are no replacements', () => {
    renderInline({
      details_markdown: `Details for {{ host.name ${ANONYMIZED_HOST} }}`,
      summary_markdown: summaryMarkdown,
    });

    expect(mockFormatter.mock.calls[1][0].markdown).toBe(
      `Details for {{ host.name ${ANONYMIZED_HOST} }}`
    );
  });

  // Original values can be longer than the UUIDs they replace, and the markdown parser slows
  // down sharply on long input.
  it('truncates the de-anonymized markdown to its bound', () => {
    renderInline({
      details_markdown: `${ANONYMIZED_HOST} `.repeat(1350),
      replacements: { [ANONYMIZED_HOST]: 'a'.repeat(1024) },
      summary_markdown: `${ANONYMIZED_HOST} `.repeat(200),
    });

    expect(mockFormatter.mock.calls.map(([props]) => props.markdown.length)).toEqual([
      8001, 50_001,
    ]);
  });
});
