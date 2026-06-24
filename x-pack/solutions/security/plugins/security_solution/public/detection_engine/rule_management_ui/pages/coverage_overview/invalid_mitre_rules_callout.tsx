/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
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
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  CoverageOverviewDashboard,
  CoverageOverviewRuleWithInvalidMitre,
} from '../../../rule_management/model/coverage_overview/dashboard';
import { RuleLink } from '../../components/rules_table/use_columns';
import * as i18n from './translations';

interface RuleListProps {
  rules: CoverageOverviewRuleWithInvalidMitre[];
}

const RuleList = memo(({ rules }: RuleListProps) => (
  <EuiFlexGroup direction="column" gutterSize="s">
    {rules.map((rule) => (
      <EuiFlexItem key={rule.id} grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
          <EuiFlexItem grow={false}>
            <RuleLink name={rule.name} id={rule.id} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.INVALID_MITRE_IDS_TOOLTIP(rule.invalidMitreIds)}>
              <EuiFlexGroup gutterSize="xs" wrap>
                {rule.invalidMitreIds.map((id) => (
                  <EuiFlexItem key={id} grow={false}>
                    <EuiBadge color="warning">{id}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
));
RuleList.displayName = 'RuleList';

export interface CoverageOverviewInvalidMitreRulesCalloutProps {
  invalidlyMappedRules: CoverageOverviewDashboard['invalidlyMappedRules'];
}

const CoverageOverviewInvalidMitreRulesCalloutComponent = ({
  invalidlyMappedRules,
}: CoverageOverviewInvalidMitreRulesCalloutProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const openModal = useCallback(() => setIsModalOpen(true), []);

  const { enabledRules, disabledRules } = invalidlyMappedRules;
  const invalidCount = enabledRules.length + disabledRules.length;

  if (invalidCount === 0) {
    return null;
  }

  // Show section headers only when both groups are non-empty; otherwise render a flat list.
  const showSections = enabledRules.length > 0 && disabledRules.length > 0;

  return (
    <>
      <EuiCallOut
        announceOnMount={false}
        data-test-subj="coverageOverviewInvalidMitreRulesCallout"
        title={i18n.INVALID_MITRE_RULES_CALLOUT_TITLE}
        color="warning"
        iconType="warning"
      >
        <p>{i18n.INVALID_MITRE_RULES_CALLOUT_DESCRIPTION(invalidCount)}</p>
        <EuiButton
          data-test-subj="coverageOverviewInvalidMitreRulesViewButton"
          color="warning"
          size="s"
          onClick={openModal}
        >
          {i18n.INVALID_MITRE_RULES_VIEW_RULES_BUTTON}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="m" />

      {isModalOpen && (
        <EuiModal
          aria-labelledby={modalTitleId}
          data-test-subj="coverageOverviewInvalidMitreRulesModal"
          onClose={closeModal}
          maxWidth={800}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>
              {i18n.INVALID_MITRE_RULES_MODAL_TITLE}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s" color="subdued">
              <p>{i18n.INVALID_MITRE_RULES_MODAL_DESCRIPTION}</p>
            </EuiText>
            <EuiSpacer size="m" />

            {showSections ? (
              <>
                <EuiTitle size="xxs">
                  <h3>{i18n.INVALID_MITRE_RULES_MODAL_ENABLED_SECTION}</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <RuleList rules={enabledRules} />
                <EuiSpacer size="m" />
                <EuiTitle size="xxs">
                  <h3>{i18n.INVALID_MITRE_RULES_MODAL_DISABLED_SECTION}</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <RuleList rules={disabledRules} />
              </>
            ) : (
              <RuleList rules={[...enabledRules, ...disabledRules]} />
            )}
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              data-test-subj="coverageOverviewInvalidMitreRulesModalCloseButton"
              onClick={closeModal}
            >
              {i18n.INVALID_MITRE_RULES_MODAL_CLOSE}
            </EuiButtonEmpty>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};

export const CoverageOverviewInvalidMitreRulesCallout = memo(
  CoverageOverviewInvalidMitreRulesCalloutComponent
);
