/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiListGroupItemProps } from '@elastic/eui';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiListGroup,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { useExecuteBulkAction } from '../../logic/bulk_actions/use_execute_bulk_action';
import { DeleteDeprecatedRulesConfirmModal } from './delete_deprecated_rules_confirm_modal';
import { RuleLink } from '../../../rule_management_ui/components/rules_table/use_columns';
import type { DeprecatedRuleForReview } from '../../../../../common/api/detection_engine/prebuilt_rules';
import * as i18n from './translations';

interface DeprecatedRulesModalProps {
  rules: DeprecatedRuleForReview[];
  isLoading: boolean;
  onClose: () => void;
}

export const DeprecatedRulesModal: React.FC<DeprecatedRulesModalProps> = ({
  rules,
  isLoading,
  onClose,
}) => {
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;
  const [isConfirmVisible, showConfirm, hideConfirm] = useBoolState();
  const { executeBulkAction } = useExecuteBulkAction();

  const handleDeleteAll = useCallback(async () => {
    hideConfirm();
    await executeBulkAction({
      type: BulkActionTypeEnum.delete,
      ids: rules.map((rule) => rule.id),
    });
    onClose();
  }, [executeBulkAction, rules, onClose, hideConfirm]);

  const deprecatedRules: EuiListGroupItemProps[] = useMemo(
    () =>
      rules.map((rule) => ({
        label: <RuleLink name={rule.name} id={rule.id} />,
        color: 'primary',
      })),
    [rules]
  );

  return (
    <>
      <EuiModal
        onClose={onClose}
        data-test-subj="deprecated-rules-modal"
        aria-label={i18n.DEPRECATED_RULES_MODAL_TITLE}
      >
        <EuiModalHeader>
          <EuiFlexGroup direction="column">
            <EuiModalHeaderTitle>{i18n.DEPRECATED_RULES_MODAL_TITLE}</EuiModalHeaderTitle>
            <EuiText size="m">
              <p>{i18n.DEPRECATED_RULES_MODAL_DESCRIPTION(rules.length)}</p>
            </EuiText>
          </EuiFlexGroup>
        </EuiModalHeader>
        <EuiHorizontalRule />
        <EuiModalBody>
          {isLoading ? (
            <EuiLoadingSpinner size="m" />
          ) : (
            <EuiListGroup flush maxWidth={false} listItems={deprecatedRules} />
          )}
        </EuiModalBody>
        <EuiModalFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} data-test-subj="deprecated-rules-modal-close">
                {i18n.CLOSE_MODAL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                color="danger"
                onClick={showConfirm}
                disabled={!canEditRules}
                data-test-subj="deprecated-rules-modal-delete-all"
              >
                {i18n.DELETE_ALL_DEPRECATED_RULES(rules.length)}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      </EuiModal>
      {isConfirmVisible && (
        <DeleteDeprecatedRulesConfirmModal
          count={rules.length}
          onCancel={hideConfirm}
          onConfirm={handleDeleteAll}
        />
      )}
    </>
  );
};
