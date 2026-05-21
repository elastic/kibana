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
import {
  createRuleAttachmentDefinition,
  isOnRuleFormPage,
  registerRuleAttachment,
} from './rule_attachment';
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
