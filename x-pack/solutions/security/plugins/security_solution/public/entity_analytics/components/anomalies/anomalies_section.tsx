/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useEuiTheme,
  useEuiFontSize,
  EuiAccordion,
  EuiTitle,
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import {
  ENTITY_ANOMALIES_SECTION_TITLE,
  ENTITY_ANOMALIES_OVERVIEW_TIMEFRAME,
} from './translations';
import {
  ANOMALIES_SECTION_TEST_ID,
  ANOMALIES_SECTION_ACCORDION_BUTTON_TEST_ID,
  ANOMALIES_SECTION_ACCORDION_TIMEFRAME_TEST_ID,
} from './test_ids';
import type { GetAnomalyOverviewResponse } from '../../../../common/api/entity_analytics';
import type { EntityDetailsPath } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { AnomaliesOverview } from './anomalies_overview';

export const EMPTY_ANOMALY_OVERVIEW: GetAnomalyOverviewResponse = {
  entityId: '',
  anomalyByTimeBucket: [],
  recentAnomalies: [],
  tacticCounts: {},
  totalAnomaliesCount: 0,
  from: 0,
  to: 0,
  hasJobsMissingThreatTactics: false,
};

interface AnomaliesSectionProps {
  data: GetAnomalyOverviewResponse;
  entityId: string;
  isPreviewMode?: boolean;
  openDetailsPanel: (path: EntityDetailsPath) => void;
  hideHeaderIcons?: boolean;
  isLoading?: boolean;
  isError?: boolean;
}

export const AnomaliesSection: React.FC<AnomaliesSectionProps> = (props) => {
  const { euiTheme } = useEuiTheme();
  const updatedAtFontSize = useEuiFontSize('xxs').fontSize;

  return (
    <>
      <EuiAccordion
        id="entity-anomalies-flyout-section"
        initialIsOpen
        data-test-subj={ANOMALIES_SECTION_TEST_ID}
        buttonProps={{
          'data-test-subj': ANOMALIES_SECTION_ACCORDION_BUTTON_TEST_ID,
          css: css`
            color: ${euiTheme.colors.primary};
          `,
        }}
        buttonContent={
          <EuiTitle size="xs">
            <h3>{ENTITY_ANOMALIES_SECTION_TITLE}</h3>
          </EuiTitle>
        }
        extraAction={
          <span
            data-test-subj={ANOMALIES_SECTION_ACCORDION_TIMEFRAME_TEST_ID}
            css={css`
              font-size: ${updatedAtFontSize};
            `}
          >
            {ENTITY_ANOMALIES_OVERVIEW_TIMEFRAME}
          </span>
        }
      >
        <EuiSpacer size="m" />
        <AnomaliesOverview {...props} />
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};
