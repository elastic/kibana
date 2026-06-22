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
import {
  BEHAVIORAL_ANOMALIES_SECTION_TITLE,
  BEHAVIORAL_ANOMALIES_V2_OVERVIEW_TIMEFRAME,
} from './translations';
import {
  BEHAVIORAL_ANOMALIES_SECTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_OVERVIEW_TIMEFRAME_TEST_ID,
  BEHAVIORAL_ANOMALIES_VERSION_SELECTOR_TEST_ID,
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
  const xsFontSize = useEuiFontSize('xs').fontSize;
  const [version, setVersion] = useState<OverviewVersion>(DEFAULT_OVERVIEW_VERSION);

  const overviewProps = useMemo(
    () => ({ entityId, isPreviewMode, openDetailsPanel }),
    [entityId, isPreviewMode, openDetailsPanel]
  );

  // Right-side timeframe badge on the section title, shown when v.2 or v.3
  // is selected (both visualize a year-at-a-glance window). Matches the
  // "Updated {time}" pattern used by the Risk score and Observed attributes
  // sections (same xs font size, subdued styling). When v.2/v.3 are dropped,
  // either remove the corresponding `version === ...` clause or render the
  // span unconditionally — see file-level cleanup notes.
  const extraAction =
    version === 'v2' || version === 'v3' ? (
      <span
        data-test-subj={BEHAVIORAL_ANOMALIES_V2_OVERVIEW_TIMEFRAME_TEST_ID}
        css={css`
          font-size: ${xsFontSize};
          color: ${euiTheme.colors.textSubdued};
        `}
      >
        {BEHAVIORAL_ANOMALIES_V2_OVERVIEW_TIMEFRAME}
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
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.behavioralAnomalies.prototypeVersionSelectorLabel',
                { defaultMessage: 'Prototype version:' }
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={i18n.translate(
                'xpack.securitySolution.entityAnalytics.behavioralAnomalies.prototypeVersionSelectorLegend',
                { defaultMessage: 'Behavioral anomalies section prototype version' }
              )}
              options={VERSION_OPTIONS}
              idSelected={version}
              onChange={(id) => setVersion(id as OverviewVersion)}
              buttonSize="compressed"
              data-test-subj={BEHAVIORAL_ANOMALIES_VERSION_SELECTOR_TEST_ID}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {version === 'v1' && <BehavioralAnomaliesOverview {...overviewProps} />}
        {version === 'v2' && <BehavioralAnomaliesOverviewV2 {...overviewProps} />}
        {version === 'v3' && <BehavioralAnomaliesOverviewV3 {...overviewProps} />}
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};
