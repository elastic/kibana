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
import * as i18n from '../../translations';
import { AccordionButtonContent, FieldLabel, SectionSeparator, Tooltip } from '../shared';
import { FormattedDate } from '../../../../../../../common/components/formatted_date';

interface BackfillSectionProps {
  backfill: { from: string; to: string };
}

export const BackfillSection: React.FC<BackfillSectionProps> = ({ backfill }) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'sourceEventTimeRange' });

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={
        <AccordionButtonContent
          tooltip={
            <Tooltip
              items={[
                { title: i18n.FLYOUT_FROM, description: i18n.FLYOUT_TOOLTIP_FROM },
                { title: i18n.FLYOUT_TO, description: i18n.FLYOUT_TOOLTIP_TO },
              ]}
            />
          }
        >
          {i18n.FLYOUT_ACCORDION_SOURCE_EVENT_TIME_RANGE}
        </AccordionButtonContent>
      }
      initialIsOpen
    >
      <EuiSpacer size="s" />
      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup>
          <EuiFlexItem>
            <FieldLabel label={i18n.FLYOUT_FROM} />
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <FormattedDate value={backfill.from} fieldName="from" />
            </EuiText>
          </EuiFlexItem>
          <SectionSeparator />
          <EuiFlexItem>
            <FieldLabel label={i18n.FLYOUT_TO} />
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <FormattedDate value={backfill.to} fieldName="to" />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiAccordion>
  );
};
