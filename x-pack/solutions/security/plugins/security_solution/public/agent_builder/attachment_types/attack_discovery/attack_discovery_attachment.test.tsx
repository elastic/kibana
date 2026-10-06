/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type {
  AttachmentServiceStartContract,
  GetActionButtonsParams,
} from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';

import { APP_UI_ID, SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { AttackDiscoveryMarkdownFormatter } from '../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';
import { INLINE_ATTACHMENT_TITLE_TEST_ID } from '../inline_attachment_title';
import {
  ATTACK_DISCOVERY_INLINE_CONTENT_TEST_ID,
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

const getUrlForApp = jest.fn(
  (appId: string, { path }: { path?: string } = {}) => `/base/app/${appId}${path ?? ''}`
);

const createDefinition = () => createAttackDiscoveryAttachmentDefinition({ getUrlForApp });

const getActionButtons = (data: AttackDiscoveryAttachment['data']) =>
  createDefinition().getActionButtons?.({
    attachment: makeAttachment(data),
    isCanvas: false,
    isSidebar: false,
  } as unknown as GetActionButtonsParams<AttackDiscoveryAttachment>) ?? [];

describe('createAttackDiscoveryAttachmentDefinition', () => {
  it('labels the attachment with the discovery title', () => {
    const definition = createDefinition();

    expect(definition.getLabel(makeAttachment({ title: 'Lateral movement' }))).toBe(
      'Lateral movement'
    );
  });

  it('labels the attachment with the de-anonymized title', () => {
    const definition = createDefinition();

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
    const definition = createDefinition();

    expect(definition.getLabel(makeAttachment({}))).toBe('Attack Discovery');
  });

  it('uses the sparkles icon', () => {
    const definition = createDefinition();

    expect(definition.getIcon?.()).toBe('sparkles');
  });

  it('uses the sparkles icon in the header', () => {
    const definition = createDefinition();

    expect(definition.getHeader?.({ attachment: makeAttachment({}) })).toEqual({
      icon: 'sparkles',
    });
  });

  it('renders inline content through AttackDiscoveryInlineContent', () => {
    const definition = createDefinition();
    const element = definition.renderInlineContent?.({
      attachment: makeAttachment({ details_markdown: 'd', summary_markdown: 's' }),
      isSidebar: false,
    }) as React.ReactElement;

    expect(element.type).toBe(AttackDiscoveryInlineContent);
  });

  describe('getActionButtons', () => {
    beforeEach(() => {
      getUrlForApp.mockClear();
    });

    // The legacy deep link resolves the discovery from either Attack Discovery index of the
    // active space.
    it('links to the discovery through the Attack Discovery deep link', () => {
      getActionButtons({ id: 'discovery-1' });

      expect(getUrlForApp).toHaveBeenCalledWith(APP_UI_ID, {
        path: '/attack_discovery?id=discovery-1',
      });
    });

    it('opens the link returned by getUrlForApp in a new tab', () => {
      const [button] = getActionButtons({ id: 'discovery-1' });

      expect(button).toEqual(
        expect.objectContaining({
          href: `/base/app/${APP_UI_ID}/attack_discovery?id=discovery-1`,
          // In the sidebar the action renders icon-only, so the icon must be a real EUI icon.
          icon: 'external',
          label: 'Open in Attacks',
          openInNewTab: true,
          type: ActionButtonType.SECONDARY,
        })
      );
    });

    // The anchor navigates; a handler that also navigated would open the page twice.
    it('does not navigate from the click handler', () => {
      const [button] = getActionButtons({ id: 'discovery-1' });

      expect(button.handler()).toBeUndefined();
    });

    it('encodes the discovery id in the link', () => {
      getActionButtons({ id: 'a&b' });

      expect(getUrlForApp).toHaveBeenCalledWith(APP_UI_ID, {
        path: '/attack_discovery?id=a%26b',
      });
    });

    it("links to the discovery's timestamp", () => {
      getActionButtons({ id: 'discovery-1', timestamp: '2026-09-27T14:05:00.000Z' });

      expect(getUrlForApp).toHaveBeenCalledWith(APP_UI_ID, {
        path: '/attack_discovery?id=discovery-1&timestamp=2026-09-27T14%3A05%3A00.000Z',
      });
    });

    it.each([
      ['no timestamp', {}],
      ['an empty timestamp', { timestamp: '' }],
    ])('links without a timestamp for a discovery with %s', (_, data) => {
      getActionButtons({ id: 'discovery-1', ...data });

      expect(getUrlForApp).toHaveBeenCalledWith(APP_UI_ID, {
        path: '/attack_discovery?id=discovery-1',
      });
    });

    it.each([
      ['no id', {}],
      ['an empty id', { id: '' }],
    ])('returns no action for a discovery with %s', (_, data) => {
      expect(getActionButtons(data)).toEqual([]);
    });
  });
});

describe('registerAttackDiscoveryAttachment', () => {
  it('registers the security.attack_discovery attachment type', () => {
    const addAttachmentType = jest.fn();
    const attachments = { addAttachmentType } as unknown as AttachmentServiceStartContract;

    registerAttackDiscoveryAttachment({ attachments, getUrlForApp });

    expect(addAttachmentType).toHaveBeenCalledWith(
      SecurityAgentBuilderAttachments.attackDiscovery,
      expect.objectContaining({
        getActionButtons: expect.any(Function),
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

  // The "Open in Attacks" action makes Agent Builder render the card's header, which shows
  // `getLabel`, so a title row of its own would show the title twice.
  it('renders no title row of its own', () => {
    renderInline({ summary_markdown: summaryMarkdown, title: 'Lateral movement' });

    expect(screen.queryByTestId(INLINE_ATTACHMENT_TITLE_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByText('Lateral movement')).not.toBeInTheDocument();
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

  // Agent Builder does not mount the Security flyout providers that interactive pills need.
  it('disables field pill actions', () => {
    renderInline({
      details_markdown: detailsMarkdown,
      summary_markdown: summaryMarkdown,
    });

    expect(mockFormatter.mock.calls.map(([props]) => props.disableActions)).toEqual([true, true]);
  });

  it('wraps field pill values to fit the conversation card', () => {
    renderInline({
      details_markdown: detailsMarkdown,
      summary_markdown: summaryMarkdown,
    });

    expect(mockFormatter.mock.calls.map(([props]) => props.wrapFieldValues)).toEqual([true, true]);
  });

  it('lets the content shrink and wrap inside the card', () => {
    renderInline({
      details_markdown: detailsMarkdown,
      summary_markdown: summaryMarkdown,
    });

    const content = screen.getByTestId(ATTACK_DISCOVERY_INLINE_CONTENT_TEST_ID);

    expect(content).toHaveStyleRule('min-width', '0');
    expect(content).toHaveStyleRule('overflow-wrap', 'anywhere');
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
