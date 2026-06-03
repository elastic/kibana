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
 * TODO(prototype): Temporary v.1 / v.2 version selector — must be removed
 * before the design hand-off.
 *
 * To drop v.2 (keep v.1):
 *   1. Delete `behavioral_anomalies_overview_v2.tsx`.
 *   2. Remove the v2 import, the `version` state, the EuiButtonGroup block,
 *      and the ternary below — render `<BehavioralAnomaliesOverview ... />`
 *      directly.
 *   3. Remove `BEHAVIORAL_ANOMALIES_VERSION_SELECTOR_TEST_ID` from
 *      `./test_ids.ts` and the matching i18n strings below.
 *
 * To drop v.1 (keep v.2):
 *   1. Delete `behavioral_anomalies_overview.tsx`.
 *   2. Remove the v1 import, the `version` state, the EuiButtonGroup block,
 *      and the ternary below — render `<BehavioralAnomaliesOverviewV2 ... />`
 *      directly.
 *   3. Remove `BEHAVIORAL_ANOMALIES_VERSION_SELECTOR_TEST_ID` from
 *      `./test_ids.ts` and the matching i18n strings below.
 */
type OverviewVersion = 'v1' | 'v2';
const DEFAULT_OVERVIEW_VERSION: OverviewVersion = 'v1';
const VERSION_OPTIONS: Array<{ id: OverviewVersion; label: string }> = [
  { id: 'v1', label: 'v.1' },
  { id: 'v2', label: 'v.2' },
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

  // Right-side timeframe badge on the section title, shown only when v.2 is
  // selected. Matches the "Updated {time}" pattern used by the Risk score and
  // Observed attributes sections (same xs font size, subdued styling).
  const extraAction =
    version === 'v2' ? (
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
        {version === 'v1' ? (
          <BehavioralAnomaliesOverview {...overviewProps} />
        ) : (
          <BehavioralAnomaliesOverviewV2 {...overviewProps} />
        )}
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};
