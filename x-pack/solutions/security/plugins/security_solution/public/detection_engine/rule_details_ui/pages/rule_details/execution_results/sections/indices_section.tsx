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

interface IndicesSectionProps {
  matchedIndicesCount: number | null | undefined;
  frozenIndicesQueriedCount: number | null | undefined;
}

export const IndicesSection: React.FC<IndicesSectionProps> = ({
  matchedIndicesCount,
  frozenIndicesQueriedCount,
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'indices' });

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={
        <AccordionButtonContent
          tooltip={
            <Tooltip
              items={[
                {
                  title: i18n.FLYOUT_MATCHED_INDICES,
                  description: i18n.FLYOUT_TOOLTIP_MATCHED_INDICES,
                },
                {
                  title: i18n.FLYOUT_FROZEN_INDICES_QUERIED,
                  description: i18n.FLYOUT_TOOLTIP_FROZEN_INDICES_QUERIED,
                },
              ]}
            />
          }
        >
          {i18n.FLYOUT_ACCORDION_INDICES}
        </AccordionButtonContent>
      }
      initialIsOpen
    >
      <EuiSpacer size="s" />
      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup>
          <EuiFlexItem>
            <FieldLabel label={i18n.FLYOUT_MATCHED_INDICES} />
            <EuiSpacer size="xs" />
            <EuiText size="s" data-test-subj="executionDetailsFlyoutMatchedIndices">
              {matchedIndicesCount ?? '—'}
            </EuiText>
          </EuiFlexItem>
          <SectionSeparator />
          <EuiFlexItem>
            <FieldLabel label={i18n.FLYOUT_FROZEN_INDICES_QUERIED} />
            <EuiSpacer size="xs" />
            <EuiText size="s" data-test-subj="executionDetailsFlyoutFrozenIndices">
              {frozenIndicesQueriedCount ?? '—'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiAccordion>
  );
};
