/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useHighlightedFieldsPrivilege } from './use_highlighted_fields_privilege';
import type { UseHighlightedFieldsPrivilegeParams } from './use_highlighted_fields_privilege';
import { usePrebuiltRuleCustomizationUpsellingMessage } from '../../../../detection_engine/rule_management/logic/prebuilt_rules/use_prebuilt_rule_customization_upselling_message';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import {
  LACK_OF_KIBANA_SECURITY_PRIVILEGES,
  ML_RULES_DISABLED_MESSAGE,
} from '../../../../detection_engine/common/translations';
import { useUserData } from '../../../../detections/components/user_info';

jest.mock('../../../../common/components/ml/hooks/use_ml_capabilities');
jest.mock(
  '../../../../detection_engine/rule_management/logic/prebuilt_rules/use_prebuilt_rule_customization_upselling_message'
);
jest.mock('../../../../../common/machine_learning/has_ml_license');
jest.mock('../../../../../common/machine_learning/has_ml_admin_permissions');
jest.mock('../../../../detections/components/user_info');

const defaultProps = {
  rule: {} as RuleResponse,
  isExistingRule: true,
};

const renderUseHighlightedFieldsPrivilege = (props: UseHighlightedFieldsPrivilegeParams) =>
  renderHook(() => useHighlightedFieldsPrivilege(props));

describe('useHighlightedFieldsPrivilege', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUserData as jest.Mock).mockReturnValue([{ canUserCRUD: true }]);
    (hasMlAdminPermissions as jest.Mock).mockReturnValue(false);
    (hasMlLicense as jest.Mock).mockReturnValue(false);
    (usePrebuiltRuleCustomizationUpsellingMessage as jest.Mock).mockReturnValue(undefined);
  });

  it('should return isDisabled as true when rule is null', () => {
    const { result } = renderUseHighlightedFieldsPrivilege({
      ...defaultProps,
      rule: null,
    });

    expect(result.current.isDisabled).toBe(true);
    expect(result.current.tooltipContent).toBe('Deleted rule cannot be edited.');
  });

  it('should return isDisabled as true when rule does not exist', () => {
    const { result } = renderUseHighlightedFieldsPrivilege({
      ...defaultProps,
      isExistingRule: false,
    });

    expect(result.current.isDisabled).toBe(true);
    expect(result.current.tooltipContent).toBe('Deleted rule cannot be edited.');
  });

  it('should return isDisabled as true when user does not have CRUD privileges', () => {
    (useUserData as jest.Mock).mockReturnValue([{ canUserCRUD: false }]);
    const { result } = renderUseHighlightedFieldsPrivilege(defaultProps);
    expect(result.current.isDisabled).toBe(true);
    expect(result.current.tooltipContent).toContain(LACK_OF_KIBANA_SECURITY_PRIVILEGES);
  });

  describe('when rule is machine learning rule', () => {
    it('should return isDisabled as true when user does not have ml permissions', () => {
      (hasMlAdminPermissions as jest.Mock).mockReturnValue(false);
      const { result } = renderUseHighlightedFieldsPrivilege({
        ...defaultProps,
        rule: { type: 'machine_learning' } as RuleResponse,
      });
      expect(result.current.isDisabled).toBe(true);
      expect(result.current.tooltipContent).toContain(ML_RULES_DISABLED_MESSAGE);
    });

    it('should return isDisabled as true when user does not have ml license', () => {
      (hasMlLicense as jest.Mock).mockReturnValue(false);
      const { result } = renderUseHighlightedFieldsPrivilege({
        ...defaultProps,
        rule: { type: 'machine_learning' } as RuleResponse,
      });
      expect(result.current.isDisabled).toBe(true);
      expect(result.current.tooltipContent).toContain(ML_RULES_DISABLED_MESSAGE);
    });

    it('should return isDisabled as false when user has ml permissions and proper license', () => {
      (hasMlAdminPermissions as jest.Mock).mockReturnValue(true);
      (hasMlLicense as jest.Mock).mockReturnValue(true);
      const { result } = renderUseHighlightedFieldsPrivilege({
        ...defaultProps,
        rule: { type: 'machine_learning' } as RuleResponse,
      });
      expect(result.current.isDisabled).toBe(false);
      expect(result.current.tooltipContent).toBe('Edit highlighted fields');
    });
  });

  describe('when rule is not machine learning rule', () => {
    it('should return isDisabled as false when rule is not immutable (custom rule)', () => {
      const { result } = renderUseHighlightedFieldsPrivilege({
        ...defaultProps,
        rule: { type: 'query', immutable: false } as RuleResponse,
      });
      expect(result.current.isDisabled).toBe(false);
      expect(result.current.tooltipContent).toBe('Edit highlighted fields');
    });

    it('should return isDisabled as false when rule is immutable (prebuilt rule) and upselling message is undefined', () => {
      (usePrebuiltRuleCustomizationUpsellingMessage as jest.Mock).mockReturnValue(undefined);
      const { result } = renderUseHighlightedFieldsPrivilege({
        ...defaultProps,
        rule: { type: 'query', immutable: true } as RuleResponse,
      });
      expect(result.current.isDisabled).toBe(false);
      expect(result.current.tooltipContent).toContain('Edit highlighted fields');
    });

    it('should return isDisabled as true when rule is immutable (prebuilt rule) and upselling message is available', () => {
      (usePrebuiltRuleCustomizationUpsellingMessage as jest.Mock).mockReturnValue(
        'upselling message'
      );
      const { result } = renderUseHighlightedFieldsPrivilege({
        ...defaultProps,
        rule: { type: 'query', immutable: true } as RuleResponse,
      });
      expect(result.current.isDisabled).toBe(true);
      expect(result.current.tooltipContent).toContain('upselling message');
    });
  });
});
