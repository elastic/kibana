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
import { humanizeDuration } from '../../utils';

interface DurationBreakdownSectionProps {
  totalSearchDurationMs: number | null;
  totalIndexingDurationMs: number | null;
}

export const DurationBreakdownSection: React.FC<DurationBreakdownSectionProps> = ({
  totalSearchDurationMs,
  totalIndexingDurationMs,
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'durationBreakdown' });

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={
        <AccordionButtonContent
          tooltip={
            <Tooltip
              items={[
                {
                  title: i18n.FLYOUT_SEARCH_DURATION,
                  description: i18n.FLYOUT_TOOLTIP_SEARCH_DURATION,
                },
                {
                  title: i18n.FLYOUT_INDEX_DURATION,
                  description: i18n.FLYOUT_TOOLTIP_INDEXING_TOTAL,
                },
              ]}
            />
          }
        >
          {i18n.FLYOUT_ACCORDION_DURATION_BREAKDOWN}
        </AccordionButtonContent>
      }
      initialIsOpen
    >
      <EuiSpacer size="s" />
      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup>
          <EuiFlexItem>
            <FieldLabel label={i18n.FLYOUT_SEARCH_DURATION} />
            <EuiSpacer size="xs" />
            <EuiText size="s" data-test-subj="executionDetailsFlyoutSearchDuration">
              {totalSearchDurationMs !== null ? humanizeDuration(totalSearchDurationMs) : '—'}
            </EuiText>
          </EuiFlexItem>
          <SectionSeparator />
          <EuiFlexItem>
            <FieldLabel label={i18n.FLYOUT_INDEX_DURATION} />
            <EuiSpacer size="xs" />
            <EuiText size="s" data-test-subj="executionDetailsFlyoutIndexDuration">
              {totalIndexingDurationMs !== null ? humanizeDuration(totalIndexingDurationMs) : '—'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiAccordion>
  );
};
