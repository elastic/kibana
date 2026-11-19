/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { THREAT_INTELLIGENCE_ENRICHMENTS_BUTTON_CONTENT_TEST_ID } from './test_ids';

const FEED_NAME_PREPOSITION = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.feedNamePreposition',
  {
    defaultMessage: 'from',
  }
);

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
        <div
          css={css`
            display: inline-grid;
          `}
          data-test-subj={THREAT_INTELLIGENCE_ENRICHMENTS_BUTTON_CONTENT_TEST_ID}
          tabIndex={0}
        >
          <div
            css={css`
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              font-weight: bold;
            `}
          >
            {title}
          </div>
        </div>
      </EuiToolTip>
    );
  }
);

EnrichmentButtonContent.displayName = 'EnrichmentButtonContent';
