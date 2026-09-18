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
  AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';

import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { AttackDiscoveryMarkdownFormatter } from '../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';
import {
  ATTACK_DISCOVERY_VERDICT_INLINE_CONTENT_TEST_ID,
  ATTACK_DISCOVERY_VERDICT_INLINE_RATIONALE_TEST_ID,
  ATTACK_DISCOVERY_VERDICT_INLINE_SCOPE_ID,
  ATTACK_DISCOVERY_VERDICT_INLINE_SUMMARY_TEST_ID,
  AttackDiscoveryVerdictInlineContent,
  createAttackDiscoveryVerdictAttachmentDefinition,
  getVerdictLabel,
  registerAttackDiscoveryVerdictAttachment,
  type AttackDiscoveryVerdictAttachment,
} from './attack_discovery_verdict_attachment';

jest.mock('../../../attack_discovery/pages/results/attack_discovery_markdown_formatter', () => ({
  AttackDiscoveryMarkdownFormatter: jest.fn(({ markdown }: { markdown: string }) => (
    <div data-test-subj="attackDiscoveryMarkdownFormatter">{markdown}</div>
  )),
}));

const mockFormatter = AttackDiscoveryMarkdownFormatter as jest.MockedFunction<
  typeof AttackDiscoveryMarkdownFormatter
>;

const defaultData: AttackDiscoveryVerdictAttachment['data'] = {
  rationale_markdown: 'Rationale for the verdict',
  summary_markdown: 'Summary the verdict was drawn from',
  verdict: 'true_positive',
};

const makeAttachment = (
  data: AttackDiscoveryVerdictAttachment['data'] = {}
): AttackDiscoveryVerdictAttachment => ({
  data,
  id: 'analysis-verdict',
  type: SecurityAgentBuilderAttachments.attackDiscoveryVerdict,
});

const renderInline = (data: AttackDiscoveryVerdictAttachment['data']) =>
  render(
    <AttackDiscoveryVerdictInlineContent attachment={makeAttachment(data)} isSidebar={false} />
  );

const VERDICT_LABELS = [
  ['true_positive', 'True positive'],
  ['false_positive', 'False positive'],
  ['inconclusive', 'Inconclusive'],
  ['failed', 'Analysis failed'],
] as const;

describe('getVerdictLabel', () => {
  it.each([
    ...VERDICT_LABELS,
    // A verdict this client does not know, and a verdict the workflow never wrote.
    ['something_else', 'Analysis verdict'],
    [undefined, 'Analysis verdict'],
  ] as ReadonlyArray<readonly [string | undefined, string]>)(
    'labels %s as "%s"',
    (verdict, expected) => {
      expect(getVerdictLabel(verdict)).toBe(expected);
    }
  );
});

describe('createAttackDiscoveryVerdictAttachmentDefinition', () => {
  let definition: AttachmentUIDefinition<AttackDiscoveryVerdictAttachment>;

  beforeEach(() => {
    definition = createAttackDiscoveryVerdictAttachmentDefinition();
  });

  it.each(VERDICT_LABELS)('labels a %s attachment as "%s"', (verdict, expected) => {
    expect(definition.getLabel(makeAttachment({ verdict }))).toBe(expected);
  });

  // `getIcon` takes no attachment, so the pill icon cannot vary by verdict.
  it('uses a static icon for the pre-send pill', () => {
    expect(definition.getIcon?.()).toBe('document');
  });

  it.each([
    ['true_positive', 'warning'],
    ['false_positive', 'checkCircleFill'],
    ['inconclusive', 'question'],
    ['failed', 'error'],
  ] as const)('uses the %s header icon %s', (verdict, expected) => {
    expect(definition.getHeader?.({ attachment: makeAttachment({ verdict }) }).icon).toBe(expected);
  });

  it('falls back to the default header icon for an unknown verdict', () => {
    expect(
      definition.getHeader?.({ attachment: makeAttachment({ verdict: 'something_else' }) }).icon
    ).toBe('document');
  });

  it.each([
    ['true_positive', 'danger'],
    ['false_positive', 'success'],
    ['inconclusive', 'warning'],
    ['failed', 'default'],
  ] as const)('colors the %s badge %s', (verdict, expected) => {
    expect(
      definition.getHeader?.({ attachment: makeAttachment({ verdict }) }).badges?.[0].color
    ).toBe(expected);
  });

  it.each(VERDICT_LABELS)('labels the %s header badge as "%s"', (verdict, expected) => {
    expect(
      definition.getHeader?.({ attachment: makeAttachment({ verdict }) }).badges?.[0].label
    ).toBe(expected);
  });

  it('names the analysis in the header subtitle', () => {
    expect(definition.getHeader?.({ attachment: makeAttachment({}) }).subtitle).toBe(
      'False positive / true positive analysis'
    );
  });

  it('renders inline content through AttackDiscoveryVerdictInlineContent', () => {
    const element = definition.renderInlineContent?.({
      attachment: makeAttachment({ summary_markdown: 's', verdict: 'true_positive' }),
      isSidebar: false,
    }) as React.ReactElement;

    expect(element.type).toBe(AttackDiscoveryVerdictInlineContent);
  });

  it('reuses AttackDiscoveryVerdictInlineContent for the conversation details flyout', () => {
    const element = definition.renderConversationDetailsContent?.({
      attachment: makeAttachment({ summary_markdown: 's', verdict: 'true_positive' }),
    }) as React.ReactElement;

    expect(element.type).toBe(AttackDiscoveryVerdictInlineContent);
  });
});

describe('registerAttackDiscoveryVerdictAttachment', () => {
  let addAttachmentType: jest.Mock;

  beforeEach(() => {
    addAttachmentType = jest.fn();

    registerAttackDiscoveryVerdictAttachment({
      attachments: { addAttachmentType } as unknown as AttachmentServiceStartContract,
    });
  });

  it('registers the security.attack_discovery.verdict attachment type', () => {
    expect(addAttachmentType).toHaveBeenCalledWith(
      SecurityAgentBuilderAttachments.attackDiscoveryVerdict,
      expect.any(Object)
    );
  });

  it.each(['getHeader', 'getIcon', 'getLabel', 'renderInlineContent'] as const)(
    'registers a definition with %s',
    (method) => {
      expect(addAttachmentType.mock.calls[0][1]).toEqual(
        expect.objectContaining({ [method]: expect.any(Function) })
      );
    }
  );
});

describe('AttackDiscoveryVerdictInlineContent', () => {
  beforeEach(() => {
    mockFormatter.mockClear();
  });

  describe('with a complete verdict', () => {
    beforeEach(() => {
      renderInline(defaultData);
    });

    it('keeps inline markdown inside a padded wrapping container', () => {
      expect(screen.getByTestId(ATTACK_DISCOVERY_VERDICT_INLINE_CONTENT_TEST_ID)).toHaveAttribute(
        'data-markdown-wrap',
        'true'
      );
    });

    it('renders the summary markdown through the Attack Discovery formatter', () => {
      expect(mockFormatter.mock.calls[0][0].markdown).toBe(defaultData.summary_markdown);
    });

    it('renders the rationale markdown when the analysis produced one', () => {
      expect(mockFormatter.mock.calls[1][0].markdown).toBe(defaultData.rationale_markdown);
    });

    it('renders the summary before the rationale', () => {
      const summary = screen.getByTestId(ATTACK_DISCOVERY_VERDICT_INLINE_SUMMARY_TEST_ID);
      const rationale = screen.getByTestId(ATTACK_DISCOVERY_VERDICT_INLINE_RATIONALE_TEST_ID);

      expect(summary.compareDocumentPosition(rationale)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    // Distinct from the discovery attachment's scope, so a field-pill flyout opened
    // from the verdict does not collide with one opened from the evidence.
    it.each([
      ['summary', 0],
      ['rationale', 1],
    ])('uses a verdict-specific scopeId on the %s formatter', (_, index) => {
      expect(mockFormatter.mock.calls[index][0].scopeId).toBe(
        ATTACK_DISCOVERY_VERDICT_INLINE_SCOPE_ID
      );
    });

    it.each([
      ['summary', 0],
      ['rationale', 1],
    ])('disables field-pill actions on the %s formatter', (_, index) => {
      expect(mockFormatter.mock.calls[index][0].disableActions).toBe(true);
    });
  });

  // `rationale_markdown` is unset until #19211 produces one.
  describe('when the analysis produced no rationale', () => {
    beforeEach(() => {
      renderInline({ summary_markdown: defaultData.summary_markdown, verdict: 'inconclusive' });
    });

    it('omits the rationale section', () => {
      expect(
        screen.queryByTestId(ATTACK_DISCOVERY_VERDICT_INLINE_RATIONALE_TEST_ID)
      ).not.toBeInTheDocument();
    });
  });

  describe('when the attachment carries no summary', () => {
    beforeEach(() => {
      renderInline({ verdict: 'failed' });
    });

    it('renders an empty summary', () => {
      expect(mockFormatter.mock.calls[0][0].markdown).toBe('');
    });
  });
});
