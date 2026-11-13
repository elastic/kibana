/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { MitreFramework } from '@kbn/security-mitre-attack-common';
import { THREAT_FRAMEWORK_DISPLAY_NAME } from '@kbn/security-mitre-attack-common';
import { RuleLink } from '../../components/rules_table/use_columns';
import type { CoverageOverviewRuleWithFrameworkInvalidMitreIds } from './helpers';
import { InvalidMitreBadge } from './shared_components/invalid_mitre_badge';
import * as i18n from './translations';

interface RuleListProps {
  rules: CoverageOverviewRuleWithFrameworkInvalidMitreIds[];
  framework: MitreFramework;
}

const RuleList = memo(({ rules, framework }: RuleListProps) => (
  <EuiFlexGroup direction="column" gutterSize="s">
    {rules.map((rule) => (
      <EuiFlexItem key={rule.id} grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
          <EuiFlexItem grow={false}>
            <RuleLink name={rule.name} id={rule.id} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" wrap>
              {rule.invalidMitreIds.map((id) => (
                <EuiFlexItem key={id} grow={false}>
                  <InvalidMitreBadge id={id} framework={framework} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
));
RuleList.displayName = 'RuleList';

export interface InvalidMitreRulesModalProps {
  enabledRules: CoverageOverviewRuleWithFrameworkInvalidMitreIds[];
  disabledRules: CoverageOverviewRuleWithFrameworkInvalidMitreIds[];
  framework: MitreFramework;
  onClose: () => void;
}

export const InvalidMitreRulesModal = memo(
  ({ enabledRules, disabledRules, framework, onClose }: InvalidMitreRulesModalProps) => {
    const modalTitleId = useGeneratedHtmlId();

    // Show section headers only when both groups are non-empty; otherwise render a flat list.
    const showSections = enabledRules.length > 0 && disabledRules.length > 0;

    return (
      <EuiModal
        aria-labelledby={modalTitleId}
        data-test-subj="coverageOverviewInvalidMitreRulesModal"
        onClose={onClose}
        maxWidth={800}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id={modalTitleId}>
            {i18n.INVALID_MITRE_RULES_MODAL_TITLE(THREAT_FRAMEWORK_DISPLAY_NAME[framework])}
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.INVALID_MITRE_RULES_MODAL_DESCRIPTION(THREAT_FRAMEWORK_DISPLAY_NAME[framework])}
            </p>
          </EuiText>
          <EuiSpacer size="m" />

          {showSections ? (
            <>
              <EuiTitle size="xxs">
                <h3>{i18n.INVALID_MITRE_RULES_MODAL_ENABLED_SECTION}</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <RuleList rules={enabledRules} framework={framework} />
              <EuiSpacer size="m" />
              <EuiTitle size="xxs">
                <h3>{i18n.INVALID_MITRE_RULES_MODAL_DISABLED_SECTION}</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <RuleList rules={disabledRules} framework={framework} />
            </>
          ) : (
            <RuleList rules={[...enabledRules, ...disabledRules]} framework={framework} />
          )}
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty
            data-test-subj="coverageOverviewInvalidMitreRulesModalCloseButton"
            onClick={onClose}
          >
            {i18n.INVALID_MITRE_RULES_MODAL_CLOSE}
          </EuiButtonEmpty>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
InvalidMitreRulesModal.displayName = 'InvalidMitreRulesModal';
