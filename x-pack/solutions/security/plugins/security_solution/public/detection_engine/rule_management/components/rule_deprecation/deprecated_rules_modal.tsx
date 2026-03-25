/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiListGroupItemProps } from '@elastic/eui';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiText,
  EuiListGroup,
  EuiLoadingSpinner,
  EuiFlexGroup,
} from '@elastic/eui';
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
  const deprecatedRules: EuiListGroupItemProps[] = useMemo(
    () =>
      rules.map((rule) => ({
        label: <RuleLink name={rule.name} id={rule.id} />,
        color: 'primary',
      })),
    [rules]
  );

  return (
    <EuiModal
      onClose={onClose}
      data-test-subj="deprecated-rules-modal"
      aria-label={i18n.DEPRECATED_RULES_MODAL_DESCRIPTION}
    >
      <EuiModalHeader>
        <EuiFlexGroup direction="column">
          <EuiModalHeaderTitle>{i18n.DEPRECATED_RULES_MODAL_TITLE}</EuiModalHeaderTitle>
          <EuiText size="s">
            <p>{i18n.DEPRECATED_RULES_MODAL_DESCRIPTION}</p>
          </EuiText>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        {isLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : (
          <EuiListGroup flush maxWidth={false} listItems={deprecatedRules} />
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onClose} data-test-subj="deprecated-rules-modal-close">
          {i18n.CLOSE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
