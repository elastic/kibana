/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Renders the BA-v.3 Anomalies table's expanded-row content. Three sections
 * (Explainer / Count of source events / Key fields) are stacked vertically
 * with a fixed 12 px gap, inside an 8 px-padded container. The Explainer
 * walks an `ExplainerSegmentV3[]` array so any "spike" segment is rendered
 * as a hollow EuiBadge with an upward arrow and danger-colored text —
 * matching the design screenshot.
 *
 * Cleanup: deletes with the rest of the `behavioral_anomalies_v3/` folder.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { BehavioralAnomalyV3TableRow, ExplainerSegmentV3 } from '../types';
import {
  ANOMALIES_TABLE_V3_COUNT_HEADING,
  ANOMALIES_TABLE_V3_DESCRIPTION_HEADING,
  ANOMALIES_TABLE_V3_KEY_FIELDS_HEADING,
} from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_COUNT_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_DESCRIPTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_EXPLAINER_SPIKE_BADGE_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_EXPLAINER_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_KEY_FIELDS_TEST_ID,
} from '../test_ids';

interface AnomalyExpandedRowV3Props {
  row: BehavioralAnomalyV3TableRow;
}

/**
 * Hollow EuiBadge variant with an upward arrow + danger-colored text — used
 * inline inside the Explainer paragraph to call out numeric spike values
 * (e.g. "42x", "12x-18x"). EuiBadge's built-in `iconType` slot inherits the
 * badge's `color` prop so we render the icon + label inside the badge body
 * to keep both in danger color while letting the badge background stay
 * "hollow" (white with a thin border).
 */
const SpikeBadge: React.FC<{ value: string }> = ({ value }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiBadge
      color="hollow"
      data-test-subj={BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_EXPLAINER_SPIKE_BADGE_TEST_ID}
      // Tighten the inner padding a touch so the badge sits neatly inline
      // with the surrounding paragraph text.
      css={css`
        vertical-align: baseline;
        line-height: 1;
      `}
    >
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        wrap={false}
        css={css`
          color: ${euiTheme.colors.danger};
        `}
      >
        <EuiFlexItem grow={false}>
          {/* `sortUp` is the cleanest single-arrow "going up" stock EUI icon
              — close enough to the diagonal trend arrow in the design. */}
          <EuiIcon type="sortUp" size="s" color={euiTheme.colors.danger} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>{value}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBadge>
  );
};

/**
 * Section wrapper: bold heading + body. Body is rendered as a child so
 * sections can mix plain text or inline badges.
 */
const ExpandedSection: React.FC<{
  heading: string;
  children: React.ReactNode;
  testSubj?: string;
}> = ({ heading, children, testSubj }) => (
  <div data-test-subj={testSubj}>
    <EuiText size="xs">
      <strong>{heading}</strong>
    </EuiText>
    <EuiSpacer size="xs" />
    <EuiText size="xs">{children}</EuiText>
  </div>
);

/**
 * Walks the explainer segments and renders text inline + spike values as
 * `SpikeBadge` chips. Returns a fragment so the result is a single
 * paragraph in the surrounding `<EuiText size="xs">`.
 */
const renderExplainer = (segments: readonly ExplainerSegmentV3[]): React.ReactNode => (
  <>
    {segments.map((segment, index) =>
      'spike' in segment ? (
        <SpikeBadge key={`spike-${index}`} value={segment.spike} />
      ) : (
        <React.Fragment key={`text-${index}`}>{segment.text}</React.Fragment>
      )
    )}
  </>
);

export const AnomalyExpandedRowV3: React.FC<AnomalyExpandedRowV3Props> = ({ row }) => (
  // Single padded flex column: 8 px breathing room around the whole panel
  // plus a fixed 12 px gap between the three sections (replaces the per-
  // section EuiSpacer stack the earlier revision used).
  <div
    data-test-subj={`${BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_DESCRIPTION_TEST_ID}-${row.id}`}
    css={css`
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `}
  >
    <ExpandedSection
      heading={ANOMALIES_TABLE_V3_DESCRIPTION_HEADING}
      testSubj={BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_EXPLAINER_TEST_ID}
    >
      {renderExplainer(row.explainer)}
    </ExpandedSection>
    <ExpandedSection
      heading={ANOMALIES_TABLE_V3_COUNT_HEADING}
      testSubj={BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_COUNT_TEST_ID}
    >
      {row.countOfSourceEvents.toLocaleString()}
    </ExpandedSection>
    <ExpandedSection
      heading={ANOMALIES_TABLE_V3_KEY_FIELDS_HEADING}
      testSubj={BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_KEY_FIELDS_TEST_ID}
    >
      {row.keyFields.join('; ')}
    </ExpandedSection>
  </div>
);
