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
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import * as i18n from '../translations';
import { AccordionButtonContent, FieldLabel, SectionSeparator, Tooltip } from './shared';

interface AlertsSectionProps {
  alertCount: number;
  candidateCount: number | null | undefined;
}

export const AlertsSection: React.FC<AlertsSectionProps> = ({ alertCount, candidateCount }) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'alerts' });

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={
        <AccordionButtonContent
          tooltip={
            <Tooltip
              items={[
                {
                  title: i18n.COLUMN_ALERTS_CREATED,
                  description: i18n.FLYOUT_TOOLTIP_ALERTS_CREATED,
                },
                {
                  title: i18n.FLYOUT_CANDIDATE_ALERTS,
                  description: i18n.FLYOUT_TOOLTIP_CANDIDATE_ALERTS,
                },
              ]}
            />
          }
        >
          {i18n.FLYOUT_ACCORDION_ALERTS}
        </AccordionButtonContent>
      }
      initialIsOpen
    >
      <EuiSpacer size="s" />
      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup>
          <EuiFlexItem>
            <FieldLabel label={i18n.COLUMN_ALERTS_CREATED} />
            <EuiSpacer size="xs" />
            <EuiText size="s" data-test-subj="executionDetailsFlyoutAlertCount">
              {alertCount}
            </EuiText>
          </EuiFlexItem>
          <SectionSeparator />
          <EuiFlexItem>
            <FieldLabel label={i18n.FLYOUT_CANDIDATE_ALERTS} />
            <EuiSpacer size="xs" />
            <EuiText size="s" data-test-subj="executionDetailsFlyoutCandidateCount">
              {candidateCount ?? '—'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiAccordion>
  );
};
