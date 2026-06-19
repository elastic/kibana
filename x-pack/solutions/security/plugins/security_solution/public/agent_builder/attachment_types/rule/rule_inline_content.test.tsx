/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { AiRuleCreationService } from '../../../detection_engine/common/ai_rule_creation_store';
import { RuleInlineContent } from './rule_inline_content';
import type { RuleAttachment } from './helpers';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(() => ({ pathname: '/' })),
}));

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
  const mockApplication = {
    navigateToApp: jest.fn(),
  } as unknown as ApplicationStart;

  beforeEach(() => {
    aiRuleCreation = new AiRuleCreationService();
  });

  afterEach(() => jest.clearAllMocks());

  const renderContent = (attachment: RuleAttachment, pathname = '/') => {
    const { useLocation } = jest.requireMock('react-router-dom');
    useLocation.mockReturnValue({ pathname });
    return render(
      <RuleInlineContent
        attachment={attachment}
        aiRuleCreation={aiRuleCreation}
        application={mockApplication}
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

  describe('duplicate-save warning', () => {
    const ATT_A = 'attachment-1';
    const ATT_B = 'attachment-2';

    const createCard = (id: string, version: number): RuleAttachment =>
      ({
        id,
        type: 'security.rule',
        data: { text: JSON.stringify(rule), attachmentLabel: rule.name },
        version,
      } as unknown as RuleAttachment);

    it('does not warn on a create card whose version has not been saved', () => {
      const { queryByText } = renderContent(createCard(ATT_A, 2));
      expect(queryByText('This rule has already been saved')).not.toBeInTheDocument();
    });

    it('warns on the exact (attachmentId, version) pair that was saved', () => {
      aiRuleCreation.markCreateSaved(ATT_A, 2);
      const { getByText } = renderContent(createCard(ATT_A, 2));
      expect(getByText('This rule has already been saved')).toBeInTheDocument();
    });

    it('does not warn on a different create card version (re-create in the same conversation)', () => {
      aiRuleCreation.markCreateSaved(ATT_A, 2);
      const { queryByText } = renderContent(createCard(ATT_A, 5));
      expect(queryByText('This rule has already been saved')).not.toBeInTheDocument();
    });

    it('saving card A does not trigger the warning on card B at the same version (no cross-card collision)', () => {
      aiRuleCreation.markCreateSaved(ATT_A, 2);
      const { queryByText } = renderContent(createCard(ATT_B, 2));
      expect(queryByText('This rule has already been saved')).not.toBeInTheDocument();
    });

    it('does not warn on an update card even if its (attachmentId, version) was saved', () => {
      aiRuleCreation.markCreateSaved(ATT_A, 2);
      const updateCard = {
        id: ATT_A,
        type: 'security.rule',
        data: { text: JSON.stringify(rule), attachmentLabel: rule.name, ruleId: 'rule-1' },
        version: 2,
      } as unknown as RuleAttachment;
      const { queryByText } = renderContent(updateCard);
      expect(queryByText('This rule has already been saved')).not.toBeInTheDocument();
    });
  });

  describe('View rule button', () => {
    const updateAttachment = (ruleId: string): RuleAttachment =>
      ({
        id: 'attachment-1',
        type: 'security.rule',
        data: { text: JSON.stringify(rule), attachmentLabel: rule.name, ruleId },
      } as unknown as RuleAttachment);

    it('shows for a saved rule when not already on the details page', () => {
      const { getByText } = renderContent(updateAttachment('rule-123'), '/some/other/page');
      expect(getByText('View rule')).toBeInTheDocument();
    });

    it('hides when already viewing the rule details page', () => {
      const { queryByText } = renderContent(
        updateAttachment('rule-123'),
        '/app/security/rules/id/rule-123'
      );
      expect(queryByText('View rule')).not.toBeInTheDocument();
    });
  });
});
