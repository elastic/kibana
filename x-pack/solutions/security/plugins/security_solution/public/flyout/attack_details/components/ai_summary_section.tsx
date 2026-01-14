/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { ExpandableSection } from '../../shared/components/expandable_section';
import { ATTACK_DETAILS_FLYOUT_PREFIX } from '../constants/test_ids';

const KEY = `${ATTACK_DETAILS_FLYOUT_PREFIX}-AIsummary`;

/**
 * Renders the AI Summary section in the Overview tab of the Attack Details flyout.
 * Displays an AI-generated summary and background information, with a toggle
 * to switch between anonymized and resolved values. The section is expandable
 * and persists its expanded state.
 */
export const AISummarySection = memo(() => {
  const expanded = useExpandSection({ title: KEY, defaultValue: true });

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <>
          <EuiIcon
            css={css`
              margin-right: 4px;
            `}
            type="sparkles"
            color="primary"
          />
          <FormattedMessage
            id="xpack.securitySolution.attackDetailsFlyout.overview.AISummary.sectionTitle"
            defaultMessage="AI Summary"
          />
        </>
      }
      localStorageKey={KEY}
      gutterSize="s"
      data-test-subj={KEY}
    >
      {
        // TODO: Add AI Summary content here
        'AISummarySection'
      }
    </ExpandableSection>
  );
});

AISummarySection.displayName = 'AISummarySection';
