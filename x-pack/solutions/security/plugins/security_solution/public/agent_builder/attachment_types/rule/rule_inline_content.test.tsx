/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AiRuleCreationService } from '../../../detection_engine/common/ai_rule_creation_store';
import { RuleInlineContent } from './rule_inline_content';
import type { RuleAttachment } from './helpers';

const rule = { name: 'Test Rule', type: 'esql', query: 'FROM logs-*' };

const makeAttachment = (ruleData: Record<string, unknown>, origin?: string): RuleAttachment =>
  ({
    id: 'attachment-1',
    type: 'security.rule',
    data: { text: JSON.stringify(ruleData), attachmentLabel: ruleData.name },
    ...(origin ? { origin } : {}),
  } as unknown as RuleAttachment);

describe('RuleInlineContent', () => {
  let aiRuleCreation: AiRuleCreationService;

  beforeEach(() => {
    aiRuleCreation = new AiRuleCreationService();
  });

  afterEach(() => jest.clearAllMocks());

  const renderContent = (attachment: RuleAttachment, pathname = '/') => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname },
      writable: true,
    });
    return render(
      <RuleInlineContent
        attachment={attachment}
        aiRuleCreation={aiRuleCreation}
        isSidebar={false}
      />
    );
  };

  it('renders nothing when the text is not valid JSON', () => {
    const attachment = {
      id: 'attachment-1',
      type: 'security.rule',
      data: { text: 'not json' },
    } as unknown as RuleAttachment;
    const { container } = renderContent(attachment);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the rule content', () => {
    const { getAllByText } = renderContent(makeAttachment(rule));
    expect(getAllByText(/ES\|QL/i).length).toBeGreaterThan(0);
  });

  it('shows the saving spinner while a save is in progress', () => {
    aiRuleCreation.requestSaveRule({ name: 'Test Rule', type: 'esql' } as never);
    const { getByText } = renderContent(makeAttachment(rule));
    expect(getByText('Saving…')).toBeInTheDocument();
  });

  it('does not show the saving spinner when not saving', () => {
    const { queryByText } = renderContent(makeAttachment(rule));
    expect(queryByText('Saving…')).not.toBeInTheDocument();
  });
});
