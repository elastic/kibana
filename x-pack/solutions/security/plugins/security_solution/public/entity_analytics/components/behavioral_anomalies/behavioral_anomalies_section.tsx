/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EntityDetailsPath } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { BehavioralAnomaliesOverview } from './behavioral_anomalies_overview';
import { BehavioralAnomaliesOverviewV2 } from './behavioral_anomalies_overview_v2';
import { BehavioralAnomaliesOverviewV3 } from './behavioral_anomalies_overview_v3';
import { BehavioralAnomaliesV3StateSelector } from './behavioral_anomalies_v3_state_selector';
import {
  DEFAULT_BEHAVIORAL_ANOMALIES_V3_CONTENT_STATE,
  type BehavioralAnomaliesV3ContentState,
} from './behavioral_anomalies_v3_content_state';
import {
  BEHAVIORAL_ANOMALIES_SECTION_TITLE,
  BEHAVIORAL_ANOMALIES_V2_OVERVIEW_TIMEFRAME,
  BEHAVIORAL_ANOMALIES_V3_OVERVIEW_TIMEFRAME,
} from './translations';
import {
  BEHAVIORAL_ANOMALIES_SECTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_OVERVIEW_TIMEFRAME_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_OVERVIEW_TIMEFRAME_TEST_ID,
  BEHAVIORAL_ANOMALIES_VERSION_SELECTOR_TEST_ID,
  BEHAVIORAL_ANOMALIES_STATE_SELECTOR_TEST_ID,
} from './test_ids';

/*
 * TODO(prototype): Temporary v.1 / v.2 / v.3 version selector — must be
 * removed before the design hand-off so only the chosen version ships.
 *
 * To drop v.3 (keep v.1 + v.2):
 *   1. Delete `behavioral_anomalies_overview_v3.tsx`.
 *   2. Remove the v3 import, the `'v3'` member of `OverviewVersion`, the
 *      `{ id: 'v3', label: 'v.3' }` entry, set `DEFAULT_OVERVIEW_VERSION`
 *      back to `'v2'`, drop the v.3 conditional branch below, and drop the
 *      `version === 'v3'` clause in the `extraAction` ternary.
 *
 * To drop v.2 (keep v.1 + v.3):
 *   1. Delete `behavioral_anomalies_overview_v2.tsx` (and
 *      `behavioral_anomalies_swimlane_v2.tsx`, `mock_data_v2.ts`).
 *   2. Remove the v2 import, the `'v2'` member of `OverviewVersion`, the
 *      `{ id: 'v2', label: 'v.2' }` entry, drop the v.2 conditional branch
 *      below, and drop the `version === 'v2'` clause in `extraAction`.
 *   3. The `mitre/` folder is shared with v.3 — keep it.
 *
 * To drop v.1 (keep v.2 + v.3):
 *   1. Delete `behavioral_anomalies_overview.tsx`.
 *   2. Remove the v1 import, the `'v1'` member of `OverviewVersion`, the
 *      `{ id: 'v1', label: 'v.1' }` entry, and drop the v.1 conditional
 *      branch below.
 *
 * Once only ONE version remains, also delete `OverviewVersion`,
 * `DEFAULT_OVERVIEW_VERSION`, `VERSION_OPTIONS`, the `useState` + the
 * EuiButtonGroup block, and inline the surviving overview directly. Then
 * remove `BEHAVIORAL_ANOMALIES_VERSION_SELECTOR_TEST_ID` from `./test_ids.ts`
 * and the two `prototypeVersionSelector*` i18n strings below.
 *
 * State selector (v.3 only): also delete `behavioral_anomalies_v3_state_content.tsx`,
 * `CONTENT_STATE_OPTIONS`, `DEFAULT_CONTENT_STATE`, the `contentState` useState,
 * the State EuiButtonGroup block, `BEHAVIORAL_ANOMALIES_STATE_SELECTOR_TEST_ID`,
 * and the v.3 state i18n strings in `translations.ts`.
 */
type OverviewVersion = 'v1' | 'v2' | 'v3';
// v.3 is the active prototype design, so it leads the switcher and is
// selected by default. When we drop versions per the cleanup notes above,
// this constant + array go away with the EuiButtonGroup.
const DEFAULT_OVERVIEW_VERSION: OverviewVersion = 'v3';
const VERSION_OPTIONS: Array<{ id: OverviewVersion; label: string }> = [
  { id: 'v3', label: 'v.3' },
  { id: 'v2', label: 'v.2' },
  { id: 'v1', label: 'v.1' },
];

// Prototype-only v.3 content state selector — visible when v.3 is selected.
// Cleanup: remove together with `behavioral_anomalies_v3_state_content.tsx`.
const DEFAULT_CONTENT_STATE = DEFAULT_BEHAVIORAL_ANOMALIES_V3_CONTENT_STATE;

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
  const updatedAtFontSize = useEuiFontSize('xxs').fontSize;
  const [version, setVersion] = useState<OverviewVersion>(DEFAULT_OVERVIEW_VERSION);
  const [contentState, setContentState] =
    useState<BehavioralAnomaliesV3ContentState>(DEFAULT_CONTENT_STATE);

  const overviewProps = useMemo(
    () => ({ entityId, isPreviewMode, openDetailsPanel }),
    [entityId, isPreviewMode, openDetailsPanel]
  );

  // Right-side timeframe badge on the section title — shown when v.2 or v.3
  // is selected. Each prototype owns its own label (v.2 = "Last 1 year",
  // v.3 = "Last 30 days", matching its left-tab date-picker default) and its
  // own test id, so the two prototypes stay independently deletable per the
  // file-level cleanup notes. Matches the "Updated {time}" pattern used by
  // the Risk score / Observed attributes sections (`useEuiFontSize('xxs')` only).
  const timeframeBadgeProps = (() => {
    if (version === 'v2') {
      return {
        testSubj: BEHAVIORAL_ANOMALIES_V2_OVERVIEW_TIMEFRAME_TEST_ID,
        label: BEHAVIORAL_ANOMALIES_V2_OVERVIEW_TIMEFRAME,
      };
    }
    if (version === 'v3') {
      return {
        testSubj: BEHAVIORAL_ANOMALIES_V3_OVERVIEW_TIMEFRAME_TEST_ID,
        label: BEHAVIORAL_ANOMALIES_V3_OVERVIEW_TIMEFRAME,
      };
    }
    return undefined;
  })();
  const extraAction = timeframeBadgeProps ? (
    <span
      data-test-subj={timeframeBadgeProps.testSubj}
      css={css`
        font-size: ${updatedAtFontSize};
      `}
    >
      {timeframeBadgeProps.label}
    </span>
  ) : undefined;

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
        extraAction={extraAction}
      >
        <EuiSpacer size="m" />
        {/* TODO(prototype): temporary version selector — see file-level note. */}
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.behavioralAnomalies.versionSelectorLabel',
                    { defaultMessage: 'Version:' }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.behavioralAnomalies.versionSelectorLegend',
                    { defaultMessage: 'Behavioral anomalies section version' }
                  )}
                  options={VERSION_OPTIONS}
                  idSelected={version}
                  onChange={(id) => setVersion(id as OverviewVersion)}
                  buttonSize="compressed"
                  data-test-subj={BEHAVIORAL_ANOMALIES_VERSION_SELECTOR_TEST_ID}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {version === 'v3' && (
            <EuiFlexItem grow={false}>
              <BehavioralAnomaliesV3StateSelector
                contentState={contentState}
                onChange={setContentState}
                data-test-subj={BEHAVIORAL_ANOMALIES_STATE_SELECTOR_TEST_ID}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {version === 'v1' && <BehavioralAnomaliesOverview {...overviewProps} />}
        {version === 'v2' && <BehavioralAnomaliesOverviewV2 {...overviewProps} />}
        {version === 'v3' && (
          <BehavioralAnomaliesOverviewV3
            {...overviewProps}
            isEmptyState={contentState === 'empty'}
            isLoadingState={contentState === 'loading'}
            isErrorState={contentState === 'error'}
          />
        )}
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};
