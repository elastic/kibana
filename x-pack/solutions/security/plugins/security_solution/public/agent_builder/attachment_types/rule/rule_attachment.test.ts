/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type {
  AttachmentServiceStartContract,
  InlineRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { RULES_FEATURE_LATEST } from '@kbn/security-solution-features/constants';
import { AiRuleCreationService } from '../../../detection_engine/common/ai_rule_creation_store';
import type { RuleResponse } from '../../../../common/api/detection_engine/model/rule_schema';
import {
  createRuleAttachmentDefinition,
  isOnRuleFormPage,
  registerRuleAttachment,
} from './rule_attachment';
import { useRuleActionButtons } from './use_rule_action_buttons';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';

const validRule = {
  name: 'Test Rule',
  type: 'query',
  description: 'A test rule',
  severity: 'high',
  risk_score: 73,
};

const validEsqlRule = {
  name: 'ES|QL Test Rule',
  type: 'esql',
  description: 'An ES|QL test rule',
  severity: 'medium',
  risk_score: 50,
};

const makeAttachment = (ruleJson: string, label?: string) => ({
  id: 'test-attachment',
  type: 'security.rule',
  data: { text: ruleJson, ...(label ? { attachmentLabel: label } : {}) },
});
const mockAddAttachmentType = jest.fn();
const mockAttachments: AttachmentServiceStartContract = {
  addAttachmentType: mockAddAttachmentType,
} as unknown as AttachmentServiceStartContract;

const makeApplication = (canEdit: boolean) =>
  ({
    capabilities: {
      [RULES_FEATURE_LATEST]: { edit_rules: canEdit },
    },
    navigateToApp: jest.fn(),
  } as unknown as ApplicationStart);

const makeUiSettings = (esqlEnabled = true) =>
  ({
    get: jest.fn((key: string) => {
      if (key === ENABLE_ESQL) return esqlEnabled;
      return undefined;
    }),
  } as unknown as IUiSettingsClient);

describe('isOnRuleFormPage', () => {
  it('returns true for rule creation path', () => {
    expect(isOnRuleFormPage('/app/security/rules/create')).toBe(true);
  });

  it('returns true for rule edit path', () => {
    expect(isOnRuleFormPage('/app/security/rules/id/edit')).toBe(true);
  });

  it('returns false for rules listing page', () => {
    expect(isOnRuleFormPage('/app/security/rules')).toBe(false);
  });

  it('returns false for unrelated paths', () => {
    expect(isOnRuleFormPage('/app/security/dashboards')).toBe(false);
  });

  it('returns false for paths containing create but not rules', () => {
    expect(isOnRuleFormPage('/app/security/other/create')).toBe(false);
  });
});

describe('createRuleAttachmentDefinition', () => {
  let aiRuleCreation: AiRuleCreationService;

  beforeEach(() => {
    aiRuleCreation = new AiRuleCreationService();
    jest.spyOn(aiRuleCreation, 'requestSaveRule');
    jest.spyOn(aiRuleCreation, 'setAiCreatedRule');
  });

  describe('definition shape', () => {
    it('does not expose a static getActionButtons — buttons are registered dynamically from RuleInlineContent', () => {
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({
        application,
        aiRuleCreation,
        uiSettings: makeUiSettings(),
      });
      expect(definition.getActionButtons).toBeUndefined();
    });
  });

  describe('registerRuleAttachment', () => {
    it('registers only the rule attachment type', () => {
      const application = makeApplication(true);
      registerRuleAttachment({
        attachments: mockAttachments,
        application,
        aiRuleCreation,
        uiSettings: makeUiSettings(),
      });

      expect(mockAddAttachmentType).toHaveBeenCalledTimes(1);
      expect(mockAddAttachmentType).toHaveBeenCalledWith(
        SecurityAgentBuilderAttachments.rule,
        expect.any(Object)
      );
    });

    it('registers rule attachment type with correct config', () => {
      const application = makeApplication(true);
      registerRuleAttachment({
        attachments: mockAttachments,
        application,
        aiRuleCreation,
        uiSettings: makeUiSettings(),
      });

      const ruleCall = mockAddAttachmentType.mock.calls.find(
        (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.rule
      );
      expect(ruleCall).toBeDefined();

      const config = ruleCall![1];
      expect(config.getIcon()).toBe('securityApp');
      expect(config.getLabel({ id: 'test', type: 'test', data: {} })).toBe('Security Rule');
    });

    it('returns attachmentLabel when provided in alert attachment data', () => {
      const application = makeApplication(true);
      registerRuleAttachment({
        attachments: mockAttachments,
        application,
        aiRuleCreation,
        uiSettings: makeUiSettings(),
      });

      const ruleCall = mockAddAttachmentType.mock.calls.find(
        (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.rule
      );
      const config = ruleCall![1];

      const attachment = {
        id: 'test',
        type: SecurityAgentBuilderAttachments.rule,
        data: { text: '{}', attachmentLabel: 'My Test Security Rule' },
      };
      expect(config.getLabel(attachment)).toBe('My Test Security Rule');
    });
  });

  describe('getLabel', () => {
    it('returns attachmentLabel when provided', () => {
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({
        application,
        aiRuleCreation,
        uiSettings: makeUiSettings(),
      });
      const label = definition.getLabel(
        makeAttachment(JSON.stringify(validRule), 'My Rule') as never
      );
      expect(label).toBe('My Rule');
    });

    it('falls back to parsed rule name when no attachmentLabel', () => {
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({
        application,
        aiRuleCreation,
        uiSettings: makeUiSettings(),
      });
      const label = definition.getLabel(makeAttachment(JSON.stringify(validRule)) as never);
      expect(label).toBe('Test Rule');
    });

    it('returns default label when rule is not parseable', () => {
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({
        application,
        aiRuleCreation,
        uiSettings: makeUiSettings(),
      });
      const label = definition.getLabel(makeAttachment('invalid') as never);
      expect(label).toBe('Security Rule');
    });
  });
});

describe('useRuleActionButtons', () => {
  const registerActionButtons = jest.fn();
  const callbacks = { registerActionButtons } as unknown as InlineRenderCallbacks;
  const saveButton = () =>
    registerActionButtons.mock.calls[registerActionButtons.mock.calls.length - 1][0].find(
      (b: { icon: string }) => b.icon === 'save'
    );

  let aiRuleCreation: AiRuleCreationService;
  let baseProps: Parameters<typeof useRuleActionButtons>[0];

  beforeEach(() => {
    aiRuleCreation = new AiRuleCreationService();
    window.history.pushState({}, '', '/');
    baseProps = {
      rule: { name: 'Test Rule', type: 'query' } as unknown as RuleResponse,
      aiRuleCreation,
      application: makeApplication(true),
      uiSettings: makeUiSettings(),
      callbacks,
      isDirty: false,
      isSaving: false,
      lastSavedRuleId: null,
      showButtons: true,
    };
  });

  afterEach(() => jest.clearAllMocks());

  it('registers no buttons when the user lacks RULES_UI_EDIT_PRIVILEGE', () => {
    renderHook(() => useRuleActionButtons({ ...baseProps, application: makeApplication(false) }));
    expect(registerActionButtons).toHaveBeenCalledWith([]);
  });

  it('registers no buttons for an ES|QL rule when ENABLE_ESQL is disabled', () => {
    renderHook(() =>
      useRuleActionButtons({
        ...baseProps,
        rule: { ...baseProps.rule!, type: 'esql' } as unknown as RuleResponse,
        uiSettings: makeUiSettings(false),
      })
    );
    expect(registerActionButtons).toHaveBeenCalledWith([]);
  });

  it('freezes the save label: "Save rule" on first render, stays frozen after a savedRuleId arrives', () => {
    const props = { ...baseProps, isDirty: true };
    const { rerender } = renderHook((p: typeof props) => useRuleActionButtons(p), {
      initialProps: props,
    });
    expect(saveButton()?.label).toBe('Save rule');
    rerender({ ...props, lastSavedRuleId: 'saved-id' });
    expect(saveButton()?.label).toBe('Save rule');
  });

  it('freezes the save label at "Save changes" when a saved rule ID is present at mount', () => {
    renderHook(() =>
      useRuleActionButtons({
        ...baseProps,
        rule: { ...baseProps.rule!, id: 'rule-123' } as unknown as RuleResponse,
      })
    );
    expect(saveButton()?.label).toBe('Save changes');
  });

  it('includes View rule when a savedRuleId exists and the user is not on a rule form page', () => {
    const savedRule = { ...baseProps.rule!, id: 'rule-123' } as unknown as RuleResponse;
    renderHook(() => useRuleActionButtons({ ...baseProps, rule: savedRule }));
    const labels = registerActionButtons.mock.calls[0][0].map((b: { label: string }) => b.label);
    expect(labels).toContain('View rule');
  });

  it('omits View rule when the user is on a rule form page', () => {
    window.history.pushState({}, '', '/app/security/rules/create');
    const savedRule = { ...baseProps.rule!, id: 'rule-123' } as unknown as RuleResponse;
    renderHook(() => useRuleActionButtons({ ...baseProps, rule: savedRule }));
    const labels = registerActionButtons.mock.calls[0][0].map((b: { label: string }) => b.label);
    expect(labels).not.toContain('View rule');
  });
});
