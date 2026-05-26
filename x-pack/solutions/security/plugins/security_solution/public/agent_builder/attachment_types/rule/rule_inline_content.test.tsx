/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { InlineRenderCallbacks } from '@kbn/agent-builder-browser/attachments';
import { RULES_FEATURE_LATEST } from '@kbn/security-solution-features/constants';
import { AiRuleCreationService } from '../../../detection_engine/common/ai_rule_creation_store';
import { RuleInlineContent } from './rule_inline_content';
import type { RuleAttachment } from './helpers';

const RULE_ID = 'rule-abc-123';
const ruleWithId = { id: RULE_ID, name: 'Test Rule', type: 'esql' };

const makeAttachment = (rule: Record<string, unknown>): RuleAttachment =>
  ({
    id: 'attachment-1',
    type: 'security.rule',
    data: { text: JSON.stringify(rule) },
  } as unknown as RuleAttachment);

const makeApplication = (): ApplicationStart =>
  ({
    capabilities: { [RULES_FEATURE_LATEST]: { edit_rules: true } },
    navigateToApp: jest.fn(),
  } as unknown as ApplicationStart);

const makeUiSettings = (): IUiSettingsClient =>
  ({ get: jest.fn() } as unknown as IUiSettingsClient);

const makeCallbacks = (): InlineRenderCallbacks =>
  ({ registerActionButtons: jest.fn() } as unknown as InlineRenderCallbacks);

describe('RuleInlineContent — lastSavedRuleId seeding', () => {
  let aiRuleCreation: AiRuleCreationService;
  let setSpy: jest.SpyInstance;

  beforeEach(() => {
    aiRuleCreation = new AiRuleCreationService();
    setSpy = jest.spyOn(aiRuleCreation, 'setLastSavedRuleId');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderContent = (
    rule: Record<string, unknown>,
    {
      renderButtons = true,
      callbacks = makeCallbacks(),
      attachment,
    }: {
      renderButtons?: boolean;
      callbacks?: InlineRenderCallbacks;
      attachment?: RuleAttachment;
    } = {}
  ) =>
    render(
      <RuleInlineContent
        attachment={attachment ?? makeAttachment(rule)}
        aiRuleCreation={aiRuleCreation}
        application={makeApplication()}
        uiSettings={makeUiSettings()}
        callbacks={callbacks}
        renderButtons={renderButtons}
        isSidebar={false}
      />
    );

  it('seeds lastSavedRuleId on mount when renderButtons is true and the rule has an id', () => {
    renderContent(ruleWithId);
    expect(setSpy).toHaveBeenCalledWith(RULE_ID);
  });

  it('does not seed when renderButtons is false', () => {
    renderContent(ruleWithId, { renderButtons: false });
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('does not seed when the attachment has no rule id', () => {
    renderContent({ name: 'Test Rule', type: 'esql' });
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('does not overwrite lastSavedRuleId on mount when it is already set', () => {
    aiRuleCreation.setLastSavedRuleId('already-set-id');
    setSpy.mockClear();

    renderContent(ruleWithId);

    expect(setSpy).not.toHaveBeenCalled();
  });

  it('re-seeds lastSavedRuleId when a conversation switch clears it', () => {
    renderContent(ruleWithId);
    setSpy.mockClear();

    act(() => {
      aiRuleCreation.setLastSavedRuleId(null);
    });

    expect(setSpy).toHaveBeenCalledWith(RULE_ID);
  });

  it('stops re-seeding after the component unmounts', () => {
    const { unmount } = renderContent(ruleWithId);

    unmount();
    setSpy.mockClear();

    act(() => {
      aiRuleCreation.setLastSavedRuleId(null);
    });

    expect(setSpy).not.toHaveBeenCalledWith(RULE_ID);
  });

  it('prefers attachment.origin over rule.id when computing savedIdFromAttachment', () => {
    renderContent(ruleWithId, {
      attachment: {
        ...makeAttachment({ id: 'json-id', name: 'Test Rule', type: 'esql' }),
        origin: 'origin-id',
      } as unknown as RuleAttachment,
    });

    expect(setSpy).toHaveBeenCalledWith('origin-id');
    expect(setSpy).not.toHaveBeenCalledWith('json-id');
  });
});
