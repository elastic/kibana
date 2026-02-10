/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkActionsDryRunErrCodeEnum } from '../../../../../../common/api/detection_engine/rule_management';
import type { BulkActionEditPayload } from '../../../../../../common/api/detection_engine/rule_management';
import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getQueryRuleParams, getMlRuleParams } from '../../../rule_schema/mocks';
import { getMockRulesAuthz } from '../../__mocks__/authz';
import { DryRunError } from './dry_run';
import {
  validateBulkEnableRule,
  validateBulkDisableRule,
  validateBulkEditRule,
  dryRunValidateBulkEditRule,
} from './validations';

const createMockMlAuthz = (valid: boolean = true) => ({
  validateRuleType: jest.fn().mockResolvedValue({ valid, message: 'mocked validation message' }),
});

describe('bulk actions validations', () => {
  describe('validateBulkEnableRule', () => {
    it('should pass when user has canEnableDisableRules permission', async () => {
      const mlAuthz = createMockMlAuthz();
      const rulesAuthz = getMockRulesAuthz();
      const rule = getRuleMock(getQueryRuleParams());

      await expect(validateBulkEnableRule({ rule, mlAuthz, rulesAuthz })).resolves.not.toThrow();
    });

    it('should throw USER_INSUFFICIENT_RULE_PRIVILEGES when canEnableDisableRules is false', async () => {
      const mlAuthz = createMockMlAuthz();
      const rulesAuthz = { ...getMockRulesAuthz(), canEnableDisableRules: false };
      const rule = getRuleMock(getQueryRuleParams());

      await expect(validateBulkEnableRule({ rule, mlAuthz, rulesAuthz })).rejects.toThrow(
        expect.objectContaining({
          errorCode: BulkActionsDryRunErrCodeEnum.USER_INSUFFICIENT_RULE_PRIVILEGES,
          message: expect.stringContaining('enable rules'),
        })
      );
    });

    it('should throw MACHINE_LEARNING_AUTH when ML authorization fails', async () => {
      const mlAuthz = createMockMlAuthz(false);
      const rulesAuthz = getMockRulesAuthz();
      const rule = getRuleMock(getMlRuleParams());

      await expect(validateBulkEnableRule({ rule, mlAuthz, rulesAuthz })).rejects.toThrow(
        expect.objectContaining({
          errorCode: BulkActionsDryRunErrCodeEnum.MACHINE_LEARNING_AUTH,
        })
      );
    });
  });

  describe('validateBulkDisableRule', () => {
    it('should pass when user has canEnableDisableRules permission', async () => {
      const mlAuthz = createMockMlAuthz();
      const rulesAuthz = getMockRulesAuthz();
      const rule = getRuleMock(getQueryRuleParams());

      await expect(validateBulkDisableRule({ rule, mlAuthz, rulesAuthz })).resolves.not.toThrow();
    });

    it('should throw USER_INSUFFICIENT_RULE_PRIVILEGES when canEnableDisableRules is false', async () => {
      const mlAuthz = createMockMlAuthz();
      const rulesAuthz = { ...getMockRulesAuthz(), canEnableDisableRules: false };
      const rule = getRuleMock(getQueryRuleParams());

      await expect(validateBulkDisableRule({ rule, mlAuthz, rulesAuthz })).rejects.toThrow(
        expect.objectContaining({
          errorCode: BulkActionsDryRunErrCodeEnum.USER_INSUFFICIENT_RULE_PRIVILEGES,
          message: expect.stringContaining('disable rules'),
        })
      );
    });

    it('should throw MACHINE_LEARNING_AUTH when ML authorization fails', async () => {
      const mlAuthz = createMockMlAuthz(false);
      const rulesAuthz = getMockRulesAuthz();
      const rule = getRuleMock(getMlRuleParams());

      await expect(validateBulkDisableRule({ rule, mlAuthz, rulesAuthz })).rejects.toThrow(
        expect.objectContaining({
          errorCode: BulkActionsDryRunErrCodeEnum.MACHINE_LEARNING_AUTH,
        })
      );
    });
  });

  describe('validateBulkEditRule', () => {
    const ruleCustomizationStatus = {
      isRulesCustomizationEnabled: true,
      productFeatureRulesCustomization: true,
      productFeaturePrebuiltRulesCrudUI: true,
    };

    it('should pass when user has canEditCustomHighlightedFields for investigation_fields actions', async () => {
      const mlAuthz = createMockMlAuthz();
      const rulesAuthz = getMockRulesAuthz();
      const editActions: BulkActionEditPayload[] = [
        { type: 'set_investigation_fields', value: { field_names: ['host.name'] } },
      ];

      await expect(
        validateBulkEditRule({
          ruleType: 'query',
          mlAuthz,
          rulesAuthz,
          edit: editActions,
          immutable: false,
          ruleCustomizationStatus,
        })
      ).resolves.not.toThrow();
    });

    it('should throw USER_INSUFFICIENT_RULE_PRIVILEGES when editing investigation_fields without canEditCustomHighlightedFields', async () => {
      const mlAuthz = createMockMlAuthz();
      const rulesAuthz = { ...getMockRulesAuthz(), canEditCustomHighlightedFields: false };
      const editActions: BulkActionEditPayload[] = [
        { type: 'set_investigation_fields', value: { field_names: ['host.name'] } },
      ];

      await expect(
        validateBulkEditRule({
          ruleType: 'query',
          mlAuthz,
          rulesAuthz,
          edit: editActions,
          immutable: false,
          ruleCustomizationStatus,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          errorCode: BulkActionsDryRunErrCodeEnum.USER_INSUFFICIENT_RULE_PRIVILEGES,
          message: expect.stringContaining('custom highlighted fields'),
        })
      );
    });

    it('should throw for add_investigation_fields without permission', async () => {
      const mlAuthz = createMockMlAuthz();
      const rulesAuthz = { ...getMockRulesAuthz(), canEditCustomHighlightedFields: false };
      const editActions: BulkActionEditPayload[] = [
        { type: 'add_investigation_fields', value: { field_names: ['host.name'] } },
      ];

      await expect(
        validateBulkEditRule({
          ruleType: 'query',
          mlAuthz,
          rulesAuthz,
          edit: editActions,
          immutable: false,
          ruleCustomizationStatus,
        })
      ).rejects.toThrow(DryRunError);
    });

    it('should throw for delete_investigation_fields without permission', async () => {
      const mlAuthz = createMockMlAuthz();
      const rulesAuthz = { ...getMockRulesAuthz(), canEditCustomHighlightedFields: false };
      const editActions: BulkActionEditPayload[] = [
        { type: 'delete_investigation_fields', value: { field_names: ['host.name'] } },
      ];

      await expect(
        validateBulkEditRule({
          ruleType: 'query',
          mlAuthz,
          rulesAuthz,
          edit: editActions,
          immutable: false,
          ruleCustomizationStatus,
        })
      ).rejects.toThrow(DryRunError);
    });

    it('should pass for non-investigation_fields actions without canEditCustomHighlightedFields', async () => {
      const mlAuthz = createMockMlAuthz();
      const rulesAuthz = { ...getMockRulesAuthz(), canEditCustomHighlightedFields: false };
      const editActions: BulkActionEditPayload[] = [{ type: 'add_tags', value: ['test-tag'] }];

      await expect(
        validateBulkEditRule({
          ruleType: 'query',
          mlAuthz,
          rulesAuthz,
          edit: editActions,
          immutable: false,
          ruleCustomizationStatus,
        })
      ).resolves.not.toThrow();
    });

    it('should throw MACHINE_LEARNING_AUTH when ML authorization fails', async () => {
      const mlAuthz = createMockMlAuthz(false);
      const rulesAuthz = getMockRulesAuthz();
      const editActions: BulkActionEditPayload[] = [{ type: 'add_tags', value: ['test-tag'] }];

      await expect(
        validateBulkEditRule({
          ruleType: 'machine_learning',
          mlAuthz,
          rulesAuthz,
          edit: editActions,
          immutable: false,
          ruleCustomizationStatus,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          errorCode: BulkActionsDryRunErrCodeEnum.MACHINE_LEARNING_AUTH,
        })
      );
    });
  });

  describe('dryRunValidateBulkEditRule', () => {
    const ruleCustomizationStatus = {
      isRulesCustomizationEnabled: true,
      productFeatureRulesCustomization: true,
      productFeaturePrebuiltRulesCrudUI: true,
    };

    it('should pass for valid edit actions with proper permissions', async () => {
      const mlAuthz = createMockMlAuthz();
      const rulesAuthz = getMockRulesAuthz();
      const rule = getRuleMock(getQueryRuleParams());
      const editActions: BulkActionEditPayload[] = [
        { type: 'set_investigation_fields', value: { field_names: ['host.name'] } },
      ];

      await expect(
        dryRunValidateBulkEditRule({
          rule,
          edit: editActions,
          mlAuthz,
          rulesAuthz,
          ruleCustomizationStatus,
        })
      ).resolves.not.toThrow();
    });

    it('should throw USER_INSUFFICIENT_RULE_PRIVILEGES when missing canEditCustomHighlightedFields', async () => {
      const mlAuthz = createMockMlAuthz();
      const rulesAuthz = { ...getMockRulesAuthz(), canEditCustomHighlightedFields: false };
      const rule = getRuleMock(getQueryRuleParams());
      const editActions: BulkActionEditPayload[] = [
        { type: 'set_investigation_fields', value: { field_names: ['host.name'] } },
      ];

      await expect(
        dryRunValidateBulkEditRule({
          rule,
          edit: editActions,
          mlAuthz,
          rulesAuthz,
          ruleCustomizationStatus,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          errorCode: BulkActionsDryRunErrCodeEnum.USER_INSUFFICIENT_RULE_PRIVILEGES,
        })
      );
    });

    it('should throw MACHINE_LEARNING_INDEX_PATTERN for ML rule with index pattern actions', async () => {
      const mlAuthz = createMockMlAuthz();
      const rulesAuthz = getMockRulesAuthz();
      const rule = getRuleMock(getMlRuleParams());
      const editActions: BulkActionEditPayload[] = [
        { type: 'set_index_patterns', value: ['logs-*'] },
      ];

      await expect(
        dryRunValidateBulkEditRule({
          rule,
          edit: editActions,
          mlAuthz,
          rulesAuthz,
          ruleCustomizationStatus,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          errorCode: BulkActionsDryRunErrCodeEnum.MACHINE_LEARNING_INDEX_PATTERN,
        })
      );
    });
  });
});
