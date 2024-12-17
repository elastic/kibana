/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useMemo } from 'react';
import styled from '@emotion/styled';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiInMemoryTable,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { THREAT_INTELLIGENCE_ENRICHMENTS_ACCORDION_TABLE_TEST_ID } from './test_ids';
import type { CtiEnrichment } from '../../../../../common/search_strategy';
import { QUERY_ID } from '../../shared/hooks/use_investigation_enrichment';
import { InspectButton } from '../../../../common/components/inspect';
import {
  getEnrichmentIdentifiers,
  buildThreatDetailsItems,
  isInvestigationTimeEnrichment,
} from '../../shared/utils/threat_intelligence';
import { EnrichmentButtonContent } from './threat_details_view_enrichment_button_content';
import { REFERENCE } from '../../../../../common/cti/constants';

const StyledH5 = styled.h5`
  line-height: 1.7rem;
`;

const INVESTIGATION_QUERY_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.investigationTimeQueryTitle',
  {
    defaultMessage: 'Enrichment with Threat Intelligence',
  }
);

/**
 * Defines the fields displayed on each row of the table
 */
export interface ThreatDetailsRow {
  /**
   * Field column showing a field of the enrichment
   */
  title: string;
  /**
   * Description column
   */
  description: {
    /**
     * Field of the enrichment
     */
    fieldName: string;
    /**
     * Value of the enrichment
     */
    value: string;
  };
}

const columns: Array<EuiBasicTableColumn<ThreatDetailsRow>> = [
  {
    field: 'title',
    truncateText: false,
    render: (title: string) => (
      <EuiTitle size="xxxs">
        <StyledH5>{title}</StyledH5>
      </EuiTitle>
    ),
    width: '220px',
    name: '',
  },
  {
    field: 'description',
    truncateText: false,
    render: (description: ThreatDetailsRow['description']) => {
      const { fieldName, value } = description;
      const tooltipChild = fieldName.match(REFERENCE) ? (
        <EuiLink href={value} target="_blank">
          {value}
        </EuiLink>
      ) : (
        <span>{value}</span>
      );
      return (
        <EuiToolTip
          data-test-subj="message-tool-tip"
          content={
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem grow={false}>
                <span>{fieldName}</span>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          {tooltipChild}
        </EuiToolTip>
      );
    },
    name: '',
  },
];

export interface EnrichmentAccordionProps {
  /**
   * Enrichment data
   */
  enrichment: CtiEnrichment;
  /**
   * Index used to pass to the table data-test-subj
   */
  index: number;
}

/**
 * Displays the enrichment data in an accordion
 */
export const EnrichmentAccordion = memo(({ enrichment, index }: EnrichmentAccordionProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    id = `threat-details-item`,
    field,
    feedName,
    type,
    value,
  } = getEnrichmentIdentifiers(enrichment);
  const accordionId = `${id}${field}`;
  const showInspectButton = useMemo(() => isInvestigationTimeEnrichment(type), [type]);
  const items = useMemo(() => buildThreatDetailsItems(enrichment), [enrichment]);

  return (
    <EuiAccordion
      id={accordionId}
      key={accordionId}
      initialIsOpen={true}
      arrowDisplay="right"
      buttonContent={<EnrichmentButtonContent field={field} feedName={feedName} value={value} />}
      extraAction={
        showInspectButton && (
          <EuiFlexItem grow={false}>
            <InspectButton queryId={QUERY_ID} title={INVESTIGATION_QUERY_TITLE} />
          </EuiFlexItem>
        )
      }
      css={css`
        .euiAccordion__triggerWrapper {
          background: ${euiTheme.colors.lightestShade};
          border-radius: ${euiTheme.size.xs};
          height: ${euiTheme.size.xl};
          margin-bottom: ${euiTheme.size.s};
          padding-left: ${euiTheme.size.s};
      `}
    >
      <EuiInMemoryTable
        columns={columns}
        compressed
        data-test-subj={`${THREAT_INTELLIGENCE_ENRICHMENTS_ACCORDION_TABLE_TEST_ID}-${index}`}
        items={items}
        css={css`
          .euiTableHeaderCell,
          .euiTableRowCell {
            border: none;
          }
          .euiTableHeaderCell .euiTableCellContent {
            padding: 0;
          }
        `}
      />
    </EuiAccordion>
  );
});

EnrichmentAccordion.displayName = 'EnrichmentAccordion';
