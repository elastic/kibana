/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { THREAT_INTELLIGENCE_ENRICHMENTS_BUTTON_CONTENT_TEST_ID } from './test_ids';

const FEED_NAME_PREPOSITION = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.feedNamePreposition',
  {
    defaultMessage: 'from',
  }
);

const OverflowParent = styled.div`
  display: inline-grid;
`;

const OverflowContainer = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: bold;
`;

export interface EnrichmentButtonContentProps {
  /**
   * The field name of the enrichment (default to an empty string)
   */
  field?: string;
  /**
   * The feed name of the enrichment (default to an empty string)
   */
  feedName?: string;
  /**
   * The value of the enrichment (default to an empty string)
   */
  value?: string;
}

/**
 * Displays the content of the button rendered in the accordion
 */
export const EnrichmentButtonContent = memo(
  ({ field = '', feedName = '', value = '' }: EnrichmentButtonContentProps) => {
    const title = `${field} ${value}${feedName ? ` ${FEED_NAME_PREPOSITION} ${feedName}` : ''}`;
    return (
      <EuiToolTip content={value}>
        <OverflowParent data-test-subj={THREAT_INTELLIGENCE_ENRICHMENTS_BUTTON_CONTENT_TEST_ID}>
          <OverflowContainer>{title}</OverflowContainer>
        </OverflowParent>
      </EuiToolTip>
    );
  }
);

EnrichmentButtonContent.displayName = 'EnrichmentButtonContent';
