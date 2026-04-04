/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import * as i18n from '../../translations';
import { AccordionButtonContent, FieldLabel, Tooltip } from '../shared';

const arrowItemCss = css`
  align-items: center;
`;

interface AlertsSectionProps {
  alertCount: number | null;
  candidateCount: number | null;
}

export const AlertsSection: React.FC<AlertsSectionProps> = ({ alertCount, candidateCount }) => {
  const { euiTheme } = useEuiTheme();
  const alertsItemCss = css`
    flex-basis: 50%;
    padding-left: ${euiTheme.size.l};
  `;

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
                  title: i18n.FLYOUT_CANDIDATE_ALERTS,
                  description: i18n.FLYOUT_TOOLTIP_CANDIDATE_ALERTS,
                },
                {
                  title: i18n.ALERTS_CREATED,
                  description: i18n.FLYOUT_TOOLTIP_ALERTS_CREATED,
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
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <FieldLabel label={i18n.FLYOUT_CANDIDATE_ALERTS} />
            <EuiSpacer size="xs" />
            <EuiText size="s" data-test-subj="executionDetailsFlyoutCandidateCount">
              {candidateCount ?? '—'}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem css={arrowItemCss}>
            <EuiIcon type="sortRight" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={alertsItemCss}>
            <FieldLabel label={i18n.ALERTS_CREATED} />
            <EuiSpacer size="xs" />
            <EuiText size="s" data-test-subj="executionDetailsFlyoutAlertCount">
              {alertCount ?? '—'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiAccordion>
  );
};
