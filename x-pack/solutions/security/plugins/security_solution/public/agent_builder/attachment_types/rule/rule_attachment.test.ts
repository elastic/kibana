/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser/attachments';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { RULES_FEATURE_LATEST } from '@kbn/security-solution-features/constants';
import { AiRuleCreationService } from '../../../detection_engine/common/ai_rule_creation_store';
import type { RuleResponse } from '../../../../common/api/detection_engine/model/rule_schema';
import { createRuleAttachmentDefinition, registerRuleAttachment } from './rule_attachment';
import { buildPendingChangeButtons, buildRuleActionButtons } from './rule_action_buttons';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';

const validRule = {
  name: 'Test Rule',
  type: 'query',
  description: 'A test rule',
  severity: 'high',
  risk_score: 73,
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

const makeApplication = (canEdit: boolean, canRead = false) =>
  ({
    capabilities: {
      [RULES_FEATURE_LATEST]: { edit_rules: canEdit, read_rules: canRead },
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

describe('createRuleAttachmentDefinition', () => {
  let aiRuleCreation: AiRuleCreationService;

  beforeEach(() => {
    aiRuleCreation = new AiRuleCreationService();
    jest.spyOn(aiRuleCreation, 'requestSaveRule');
    jest.spyOn(aiRuleCreation, 'setAiCreatedRule');
  });

  describe('definition shape', () => {
    it('exposes getActionButtons for the buttons that do not depend on the saved rule', () => {
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({
        application,
        aiRuleCreation,
        uiSettings: makeUiSettings(),
      });
      expect(definition.getActionButtons).toEqual(expect.any(Function));
    });
  });

  describe('getActionButtons (intent wiring)', () => {
    const buildButtons = (
      attachmentData: Record<string, unknown>,
      { canEdit = true, origin }: { canEdit?: boolean; origin?: string } = {}
    ) => {
      const definition = createRuleAttachmentDefinition({
        application: makeApplication(canEdit),
        aiRuleCreation,
        uiSettings: makeUiSettings(),
      });
      return definition.getActionButtons!({
        attachment: {
          id: 'a',
          type: SecurityAgentBuilderAttachments.rule,
          data: attachmentData,
          ...(origin ? { origin } : {}),
        },
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
      } as never);
    };
    const primaryLabel = (buttons: ReturnType<typeof buildButtons>) =>
      buttons.find((b) => b.type === 'primary')?.label;

    beforeEach(() => {
      window.history.pushState({}, '', '/');
    });

    it('labels an unsaved attachment "Create rule" (no ruleId, no origin)', () => {
      expect(primaryLabel(buildButtons({ text: JSON.stringify(validRule) }))).toBe('Create rule');
    });

    it('gives an attachment with `origin` set only "View rule"', () => {
      // `origin` links the card to a saved rule. Update rule depends on the saved rule, so the
      // card body registers it; the static buttons only offer View rule.
      expect(
        buildButtons({ text: JSON.stringify(validRule) }, { origin: 'rule-1' }).map((b) => b.label)
      ).toEqual(['View rule']);
    });

    it('returns no buttons when the user cannot edit rules', () => {
      expect(buildButtons({ text: JSON.stringify(validRule) }, { canEdit: false })).toEqual([]);
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

describe('buildRuleActionButtons', () => {
  let aiRuleCreation: AiRuleCreationService;
  let baseProps: Parameters<typeof buildRuleActionButtons>[0];

  const primaryButton = (buttons: ReturnType<typeof buildRuleActionButtons>) =>
    buttons.find((b) => b.type === 'primary');
  const labels = (buttons: ReturnType<typeof buildRuleActionButtons>) =>
    buttons.map((b) => b.label);

  beforeEach(() => {
    aiRuleCreation = new AiRuleCreationService();
    jest.spyOn(aiRuleCreation, 'requestSaveRule');
    jest.spyOn(aiRuleCreation, 'setAiCreatedRule');
    window.history.pushState({}, '', '/');
    baseProps = {
      rule: { name: 'Test Rule', type: 'query' } as unknown as RuleResponse,
      aiRuleCreation,
      application: makeApplication(true),
      uiSettings: makeUiSettings(),
      intent: 'create',
      ruleId: undefined,
      attachmentId: 'air:testcard',
      updateOrigin: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => jest.clearAllMocks());

  it('returns no buttons when the user lacks RULES_UI_EDIT_PRIVILEGE', () => {
    expect(buildRuleActionButtons({ ...baseProps, application: makeApplication(false) })).toEqual(
      []
    );
  });

  it('returns no buttons for an ES|QL rule when ENABLE_ESQL is disabled', () => {
    expect(
      buildRuleActionButtons({
        ...baseProps,
        rule: { ...baseProps.rule!, type: 'esql' } as unknown as RuleResponse,
        uiSettings: makeUiSettings(false),
      })
    ).toEqual([]);
  });

  it('returns a "Create rule" primary action for a create-intent attachment', () => {
    const buttons = buildRuleActionButtons(baseProps);
    expect(primaryButton(buttons)?.label).toBe('Create rule');
    expect(primaryButton(buttons)?.icon).toBe('plusCircle');
  });

  it('requests a save with the attachmentId for a create-intent attachment', () => {
    const buttons = buildRuleActionButtons({ ...baseProps });
    primaryButton(buttons)!.handler();
    expect(aiRuleCreation.requestSaveRule).toHaveBeenCalledWith(
      expect.not.objectContaining({ id: expect.anything() }),
      expect.objectContaining({ attachmentId: 'air:testcard' })
    );
  });

  it('"Apply to rule form" calls setAiCreatedRule with the rule and attachmentId', () => {
    const buttons = buildRuleActionButtons(baseProps);
    buttons.find((b) => b.label === 'Apply to rule form')!.handler();
    expect(aiRuleCreation.setAiCreatedRule).toHaveBeenCalledWith(baseProps.rule, 'air:testcard');
  });

  it('guards against a double-submit while a save is already in flight', () => {
    aiRuleCreation.requestSaveRule({ name: 'in flight' } as unknown as RuleResponse, {
      attachmentId: 'air:testcard',
    });
    (aiRuleCreation.requestSaveRule as jest.Mock).mockClear();
    expect(aiRuleCreation.getIsSaving()).toBe(true);

    primaryButton(buildRuleActionButtons(baseProps))!.handler();
    expect(aiRuleCreation.requestSaveRule).not.toHaveBeenCalled();
  });

  it('omits View rule from action buttons for create intent even when a ruleId is present', () => {
    expect(labels(buildRuleActionButtons({ ...baseProps, ruleId: 'rule-123' }))).not.toContain(
      'View rule'
    );
  });

  it('navigates to create path for create intent even when a ruleId is present', () => {
    const application = makeApplication(true);
    const buttons = buildRuleActionButtons({
      ...baseProps,
      application,
      ruleId: 'rule-123',
    });
    buttons.find((b) => b.label === 'Apply to rule form')!.handler();
    expect(application.navigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      path: expect.stringContaining('/create'),
    });
  });

  it('labels the apply button "Apply to rule form" regardless of the current page', () => {
    expect(labels(buildRuleActionButtons(baseProps))).toContain('Apply to rule form');
  });

  describe('update intent', () => {
    const updateProps = () => ({ ...baseProps, intent: 'update' as const, ruleId: 'rule-123' });

    it('returns only View rule', () => {
      expect(labels(buildRuleActionButtons(updateProps()))).toEqual(['View rule']);
    });

    it('returns View rule for a user who can read but not edit rules', () => {
      expect(
        labels(
          buildRuleActionButtons({ ...updateProps(), application: makeApplication(false, true) })
        )
      ).toEqual(['View rule']);
    });

    it('returns no buttons for a user who cannot read rules', () => {
      expect(
        buildRuleActionButtons({ ...updateProps(), application: makeApplication(false, false) })
      ).toEqual([]);
    });

    it('returns no buttons when there is no saved rule id', () => {
      expect(buildRuleActionButtons({ ...updateProps(), ruleId: undefined })).toEqual([]);
    });

    it('returns View rule for an ES|QL rule when ENABLE_ESQL is disabled', () => {
      expect(
        labels(
          buildRuleActionButtons({
            ...updateProps(),
            rule: { ...baseProps.rule!, type: 'esql' } as unknown as RuleResponse,
            uiSettings: makeUiSettings(false),
          })
        )
      ).toEqual(['View rule']);
    });

    it('"View rule" opens the rule details page of the saved rule', () => {
      const application = makeApplication(true);
      buildRuleActionButtons({ ...updateProps(), application })[0].handler();
      expect(application.navigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
        path: expect.stringContaining('/id/rule-123'),
      });
    });
  });
});

describe('buildPendingChangeButtons', () => {
  let aiRuleCreation: AiRuleCreationService;
  let baseProps: Parameters<typeof buildPendingChangeButtons>[0];

  const byLabel = (buttons: ReturnType<typeof buildPendingChangeButtons>, label: string) =>
    buttons.find((b) => b.label === label);

  beforeEach(() => {
    aiRuleCreation = new AiRuleCreationService();
    jest.spyOn(aiRuleCreation, 'requestSaveRule');
    jest.spyOn(aiRuleCreation, 'setAiCreatedRule');
    baseProps = {
      rule: { name: 'Test Rule', type: 'esql' } as unknown as RuleResponse,
      aiRuleCreation,
      application: makeApplication(true),
      uiSettings: makeUiSettings(),
      attachmentId: 'air:testcard',
      ruleId: 'rule-123',
    };
  });

  afterEach(() => jest.clearAllMocks());

  it('makes an enabled "Update rule" the primary action for an ES|QL rule', () => {
    const buttons = buildPendingChangeButtons(baseProps);
    expect(buttons.map((b) => [b.label, b.type, Boolean(b.disabled)])).toEqual([
      ['Update rule', 'primary', false],
      ['Apply to rule form', 'secondary', false],
    ]);
  });

  it('makes "Apply to rule form" the primary action and disables "Update rule" for a non-ES|QL rule', () => {
    const buttons = buildPendingChangeButtons({
      ...baseProps,
      rule: { ...baseProps.rule, type: 'query' } as unknown as RuleResponse,
    });
    expect(buttons.map((b) => [b.label, b.type, Boolean(b.disabled)])).toEqual([
      ['Apply to rule form', 'primary', false],
      ['Update rule', 'secondary', true],
    ]);
    expect(byLabel(buttons, 'Update rule')?.disabledReason).toEqual(expect.any(String));
  });

  it('"Update rule" requests a save of the saved rule id with the attachmentId', () => {
    byLabel(buildPendingChangeButtons(baseProps), 'Update rule')!.handler();
    expect(aiRuleCreation.requestSaveRule).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rule-123' }),
      expect.objectContaining({ attachmentId: 'air:testcard' })
    );
  });

  it('"Update rule" guards against a double-submit while a save is in flight', () => {
    aiRuleCreation.requestSaveRule({ name: 'in flight' } as unknown as RuleResponse, {
      attachmentId: 'air:testcard',
    });
    (aiRuleCreation.requestSaveRule as jest.Mock).mockClear();

    byLabel(buildPendingChangeButtons(baseProps), 'Update rule')!.handler();
    expect(aiRuleCreation.requestSaveRule).not.toHaveBeenCalled();
  });

  it('"Apply to rule form" applies the rule and opens the edit page of the saved rule', () => {
    byLabel(buildPendingChangeButtons(baseProps), 'Apply to rule form')!.handler();
    expect(aiRuleCreation.setAiCreatedRule).toHaveBeenCalledWith(baseProps.rule, 'air:testcard');
    expect(baseProps.application.navigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      path: expect.stringContaining('/id/rule-123/edit'),
    });
  });

  it('returns no buttons when the user lacks RULES_UI_EDIT_PRIVILEGE', () => {
    expect(
      buildPendingChangeButtons({ ...baseProps, application: makeApplication(false, true) })
    ).toEqual([]);
  });

  it('returns no buttons for an ES|QL rule when ENABLE_ESQL is disabled', () => {
    expect(buildPendingChangeButtons({ ...baseProps, uiSettings: makeUiSettings(false) })).toEqual(
      []
    );
  });
});
