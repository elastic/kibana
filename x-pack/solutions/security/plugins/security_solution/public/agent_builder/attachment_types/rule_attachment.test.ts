/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { RULES_FEATURE_ID_V3 } from '@kbn/security-solution-features/constants';
import { AiRuleCreationService } from '../../detection_engine/common/ai_rule_creation_store';
import {
  createRuleAttachmentDefinition,
  isOnRuleFormPage,
  registerRuleAttachment,
} from './rule_attachment';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';

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

const makeApplication = (canEdit: boolean) =>
  ({
    capabilities: {
      [RULES_FEATURE_ID_V3]: { edit_rules: canEdit },
    },
    navigateToApp: jest.fn(),
  } as unknown as ApplicationStart);

const makeActionButtonsParams = (ruleJson: string) => ({
  attachment: makeAttachment(ruleJson),
  isSidebar: false,
  isCanvas: false,
  updateOrigin: jest.fn(),
});

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
  const originalLocation = window.location;

  beforeEach(() => {
    aiRuleCreation = new AiRuleCreationService();
    jest.spyOn(aiRuleCreation, 'setAiCreatedRule');
    delete (window as { location?: Location }).location;
    (window as { location: unknown }).location = { pathname: '/' };
  });

  afterAll(() => {
    (window as { location: unknown }).location = originalLocation;
  });

  describe('registerRuleAttachment', () => {
    it('registers only the rule attachment type', () => {
      const application = makeApplication(true);
      registerRuleAttachment({
        attachments: mockAttachments,
        application,
        aiRuleCreation,
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

  describe('getActionButtons', () => {
    it('returns empty array when attachment data is not parseable JSON', () => {
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({ application, aiRuleCreation });
      const buttons = definition.getActionButtons!(makeActionButtonsParams('not-json') as never);
      expect(buttons).toEqual([]);
    });

    it('returns empty array when parsed rule has no name', () => {
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({ application, aiRuleCreation });
      const buttons = definition.getActionButtons!(
        makeActionButtonsParams(JSON.stringify({ type: 'query' })) as never
      );
      expect(buttons).toEqual([]);
    });

    it('returns empty array when user lacks edit capabilities', () => {
      const application = makeApplication(false);
      const definition = createRuleAttachmentDefinition({ application, aiRuleCreation });
      const buttons = definition.getActionButtons!(
        makeActionButtonsParams(JSON.stringify(validRule)) as never
      );
      expect(buttons).toEqual([]);
    });

    it('returns "Apply to creation" button when not on a rule form page', () => {
      (window as { location: unknown }).location = { pathname: '/app/security/overview' };
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({ application, aiRuleCreation });
      const buttons = definition.getActionButtons!(
        makeActionButtonsParams(JSON.stringify(validRule)) as never
      );
      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Apply to creation');
      expect(buttons[0].type).toBe(ActionButtonType.PRIMARY);
    });

    it('returns "Update rule" button when on a rule creation page', () => {
      (window as { location: unknown }).location = {
        pathname: '/app/security/rules/create',
      };
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({ application, aiRuleCreation });
      const buttons = definition.getActionButtons!(
        makeActionButtonsParams(JSON.stringify(validRule)) as never
      );
      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Update rule');
    });

    it('returns "Update rule" button when on a rule edit page', () => {
      (window as { location: unknown }).location = {
        pathname: '/app/security/rules/abc123/edit',
      };
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({ application, aiRuleCreation });
      const buttons = definition.getActionButtons!(
        makeActionButtonsParams(JSON.stringify(validRule)) as never
      );
      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Update rule');
    });

    it('handler calls setAiCreatedRule with the parsed rule', () => {
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({ application, aiRuleCreation });
      const buttons = definition.getActionButtons!(
        makeActionButtonsParams(JSON.stringify(validRule)) as never
      );

      buttons[0].handler();

      expect(aiRuleCreation.setAiCreatedRule).toHaveBeenCalledWith(validRule);
    });

    it('handler navigates to rule creation when not on a rule form page', () => {
      (window as { location: unknown }).location = { pathname: '/app/security/overview' };
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({ application, aiRuleCreation });
      const buttons = definition.getActionButtons!(
        makeActionButtonsParams(JSON.stringify(validRule)) as never
      );

      buttons[0].handler();

      expect(application.navigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
        path: '/rules/create',
      });
    });

    it('handler does not navigate when already on a rule form page', () => {
      (window as { location: unknown }).location = {
        pathname: '/app/security/rules/create',
      };
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({ application, aiRuleCreation });
      const buttons = definition.getActionButtons!(
        makeActionButtonsParams(JSON.stringify(validRule)) as never
      );

      buttons[0].handler();

      expect(application.navigateToApp).not.toHaveBeenCalled();
    });
  });

  describe('getLabel', () => {
    it('returns attachmentLabel when provided', () => {
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({ application, aiRuleCreation });
      const label = definition.getLabel(
        makeAttachment(JSON.stringify(validRule), 'My Rule') as never
      );
      expect(label).toBe('My Rule');
    });

    it('falls back to parsed rule name when no attachmentLabel', () => {
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({ application, aiRuleCreation });
      const label = definition.getLabel(makeAttachment(JSON.stringify(validRule)) as never);
      expect(label).toBe('Test Rule');
    });

    it('returns default label when rule is not parseable', () => {
      const application = makeApplication(true);
      const definition = createRuleAttachmentDefinition({ application, aiRuleCreation });
      const label = definition.getLabel(makeAttachment('invalid') as never);
      expect(label).toBe('Security Rule');
    });
  });
});
