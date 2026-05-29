/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiHorizontalRule, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { EntityDetailsPath } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { BehavioralAnomaliesOverview } from './behavioral_anomalies_overview';
import { BEHAVIORAL_ANOMALIES_SECTION_TITLE } from './translations';
import { BEHAVIORAL_ANOMALIES_SECTION_TEST_ID } from './test_ids';

interface BehavioralAnomaliesSectionProps {
  entityId: string;
  isPreviewMode: boolean;
  openDetailsPanel: (path: EntityDetailsPath) => void;
}

export const BehavioralAnomaliesSection: React.FC<BehavioralAnomaliesSectionProps> = ({
  entityId,
  isPreviewMode,
  openDetailsPanel,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiAccordion
        id="behavioral_anomalies_section"
        initialIsOpen
        data-test-subj={BEHAVIORAL_ANOMALIES_SECTION_TEST_ID}
        buttonProps={{
          'data-test-subj': 'behavioral-anomalies-accordion-button',
          css: css`
            color: ${euiTheme.colors.primary};
          `,
        }}
        buttonContent={
          <EuiTitle size="xs">
            <h3>{BEHAVIORAL_ANOMALIES_SECTION_TITLE}</h3>
          </EuiTitle>
        }
      >
        <EuiSpacer size="m" />
        <BehavioralAnomaliesOverview
          entityId={entityId}
          isPreviewMode={isPreviewMode}
          openDetailsPanel={openDetailsPanel}
        />
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};
