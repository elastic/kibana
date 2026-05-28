/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import { DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS } from '../../../rule_management/components/rule_details/constants';
import { RuleAboutSection } from '../../../rule_management/components/rule_details/rule_about_section';
import { RuleDefinitionSection } from '../../../rule_management/components/rule_details/rule_definition_section';
import * as i18n from './translations';

interface OverviewTabProps {
  rule: RuleHistoryItem['rule'];
}

export function OverviewTab({ rule }: OverviewTabProps): JSX.Element {
  const aboutId = useGeneratedHtmlId();
  const definitionId = useGeneratedHtmlId();

  return (
    <>
      <EuiAccordion
        id={aboutId}
        buttonContent={
          <EuiTitle size="m">
            <h3>{i18n.OVERVIEW_ABOUT_TITLE}</h3>
          </EuiTitle>
        }
        initialIsOpen
        data-test-subj="ruleChangeHistoryFlyoutAboutSection"
      >
        <EuiFlexGroup justifyContent="spaceBetween">
          <RuleAboutSection rule={rule} hideName={false} hideDescription={false} />
        </EuiFlexGroup>
      </EuiAccordion>
      <EuiSpacer size="m" />
      <EuiHorizontalRule />
      <EuiSpacer size="l" />
      <EuiAccordion
        id={definitionId}
        buttonContent={
          <EuiTitle size="m">
            <h3>{i18n.OVERVIEW_DEFINITION_TITLE}</h3>
          </EuiTitle>
        }
        initialIsOpen
        data-test-subj="ruleChangeHistoryFlyoutDefinitionSection"
      >
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="spaceBetween">
          <RuleDefinitionSection
            rule={rule}
            columnWidths={DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS}
          />
        </EuiFlexGroup>
      </EuiAccordion>
      <EuiSpacer size="m" />
    </>
  );
}
