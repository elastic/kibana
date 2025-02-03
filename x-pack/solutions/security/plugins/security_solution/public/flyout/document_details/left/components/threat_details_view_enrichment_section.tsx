/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  THREAT_INTELLIGENCE_ENRICHMENTS_TITLE_TEST_ID,
  THREAT_INTELLIGENCE_LOADING_ENRICHMENTS_TEST_ID,
  THREAT_INTELLIGENCE_NO_ENRICHMENTS_FOUND_TEST_ID,
} from './test_ids';
import { isInvestigationTimeEnrichment } from '../../shared/utils/threat_intelligence';
import type { CtiEnrichment } from '../../../../../common/search_strategy';
import { ENRICHMENT_TYPES } from '../../../../../common/cti/constants';
import { EnrichmentAccordionGroup } from './threat_details_view_enrichment_accordion_group';

const INDICATOR_ENRICHMENT_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.indicatorEnrichmentTitle',
  {
    defaultMessage: 'Threat match detected',
  }
);

const INVESTIGATION_ENRICHMENT_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.investigationEnrichmentTitle',
  {
    defaultMessage: 'Enriched with threat intelligence',
  }
);

const INDICATOR_TOOLTIP_CONTENT = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.indicatorEnrichmentTooltipContent',
  {
    defaultMessage: 'Shows available threat indicator matches.',
  }
);

const INVESTIGATION_TOOLTIP_CONTENT = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.investigationEnrichmentTooltipContent',
  {
    defaultMessage:
      'Shows additional threat intelligence for the alert. The past 30 days were queried by default.',
  }
);

const NO_ENRICHMENTS_FOUND_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.noEnrichmentsFoundDescription',
  {
    defaultMessage: 'This alert does not have threat intelligence.',
  }
);

const InlineBlock = styled.div`
  display: inline-block;
  line-height: 1.7em;
`;

export interface EnrichmentSectionProps {
  /**
   * The enrichments to display
   */
  enrichments: CtiEnrichment[] | undefined;
  /**
   * The type of enrichment (InvestigationTime or IndicatorMatchRule)
   */
  type?: ENRICHMENT_TYPES;
  /**
   * Whether the enrichments are loading
   */
  loading?: boolean;
  /**
   * The data-test-subj to apply to the component
   */
  dataTestSubj?: string;
  /**
   * The children to render
   */
  children?: React.ReactNode;
}

/**
 * Displays the enrichments in multiple accordions when data has loaded.
 * While data is loading, it renders a skeleton.
 * If no data is found, it displays a message.
 * Also allows to render a component passed from the parent (currently used to render a range picker).
 */
export const EnrichmentSection = memo(
  ({ enrichments, type, loading, dataTestSubj, children }: EnrichmentSectionProps) => {
    const tooltip = useMemo(
      () =>
        isInvestigationTimeEnrichment(type)
          ? INVESTIGATION_TOOLTIP_CONTENT
          : INDICATOR_TOOLTIP_CONTENT,
      [type]
    );

    const noEnrichmentDataMessage = useMemo(
      () => (
        <InlineBlock data-test-subj={THREAT_INTELLIGENCE_NO_ENRICHMENTS_FOUND_TEST_ID}>
          {type === ENRICHMENT_TYPES.IndicatorMatchRule ? (
            NO_ENRICHMENTS_FOUND_DESCRIPTION
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.enrichment.noInvestigationEnrichment"
              defaultMessage="Additional threat intelligence wasn't found within the selected time frame. Try a different time frame, or {link} to collect threat intelligence for threat detection and matching."
              values={{
                link: (
                  <EuiLink
                    href="https://www.elastic.co/guide/en/security/current/es-threat-intel-integrations.html"
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.enrichment.investigationEnrichmentDocumentationLink"
                      defaultMessage="enable threat intelligence integrations"
                    />
                  </EuiLink>
                ),
              }}
            />
          )}
        </InlineBlock>
      ),
      [type]
    );

    return (
      <div data-test-subj={dataTestSubj}>
        {type ? (
          <>
            <EuiFlexGroup
              direction="row"
              gutterSize="xs"
              alignItems="baseline"
              data-test-subj={THREAT_INTELLIGENCE_ENRICHMENTS_TITLE_TEST_ID}
            >
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxxs">
                  <h3>
                    {type === ENRICHMENT_TYPES.IndicatorMatchRule
                      ? INDICATOR_ENRICHMENT_TITLE
                      : INVESTIGATION_ENRICHMENT_TITLE}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={tooltip}>
                  <EuiIcon type="iInCircle" size="m" />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        ) : null}

        {children}

        {Array.isArray(enrichments) ? (
          <EnrichmentAccordionGroup enrichments={enrichments} />
        ) : (
          <>
            {type ? noEnrichmentDataMessage : null}
            {loading && (
              <>
                <EuiSpacer size="m" />
                <EuiSkeletonText
                  data-test-subj={THREAT_INTELLIGENCE_LOADING_ENRICHMENTS_TEST_ID}
                  lines={4}
                />
              </>
            )}
          </>
        )}
      </div>
    );
  }
);

EnrichmentSection.displayName = 'EnrichmentSection';
