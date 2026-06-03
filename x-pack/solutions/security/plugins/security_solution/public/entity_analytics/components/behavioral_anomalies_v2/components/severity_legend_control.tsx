/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  useEuiTheme,
  EuiFormControlLayout,
  EuiIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SeverityOptionV2 } from '../hooks/use_severity_options';
import { getSeverityRangeDisplayV2 } from '../hooks/use_severity_options';
import { BEHAVIORAL_ANOMALIES_V2_SEVERITY_LEGEND_TEST_ID } from '../test_ids';

/**
 * BA-v.2 local copy of ML Anomaly Explorer's `SeverityLegendControl`
 * (x-pack/platform/plugins/shared/ml/public/application/explorer/components/severity_legend_control/).
 *
 * Reused here so the behavioral anomalies timeline matches the Anomaly
 * Explorer's score-filter affordance instead of the EA panel-style filter.
 */

export interface SeverityLegendControlV2Props {
  allSeverityOptions: SeverityOptionV2[];
  selectedSeverities: SeverityOptionV2[];
  onChange: (selectedSeverities: SeverityOptionV2[]) => void;
  dataTestSubj?: string;
}

export const SeverityLegendControlV2: FC<SeverityLegendControlV2Props> = ({
  allSeverityOptions,
  selectedSeverities,
  onChange,
  dataTestSubj = BEHAVIORAL_ANOMALIES_V2_SEVERITY_LEGEND_TEST_ID,
}) => {
  const { euiTheme } = useEuiTheme();

  const severityControlCss = css({
    height: '100%',
    padding: `0 ${euiTheme.size.s}`,
  });
  const severityButtonCss = css({
    padding: `${euiTheme.size.xs}`,
    '&:hover': { backgroundColor: 'transparent' },
    '&:focus': { backgroundColor: 'transparent' },
  });
  const severityTextCss = (isSelected: boolean) =>
    css({
      color: isSelected ? euiTheme.colors.textParagraph : euiTheme.colors.textDisabled,
    });

  const handleSeverityClick = useCallback(
    (clickedSeverity: SeverityOptionV2) => {
      const isCurrentlySelected = selectedSeverities.some(
        (severity) => severity.val === clickedSeverity.val
      );
      const allSelected = selectedSeverities.length === allSeverityOptions.length;

      let newSelectedSeverities: SeverityOptionV2[];

      if (allSelected) {
        newSelectedSeverities = [clickedSeverity];
      } else if (isCurrentlySelected && selectedSeverities.length === 1) {
        newSelectedSeverities = [...allSeverityOptions];
      } else if (isCurrentlySelected) {
        newSelectedSeverities = selectedSeverities.filter(
          (severity) => severity.val !== clickedSeverity.val
        );
      } else {
        newSelectedSeverities = [...selectedSeverities, clickedSeverity];
      }

      onChange(newSelectedSeverities);
    },
    [selectedSeverities, allSeverityOptions, onChange]
  );

  const severityControl = (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {allSeverityOptions.map((severity) => {
        const isSelected = selectedSeverities.some((s) => s.val === severity.val);

        return (
          <EuiFlexItem key={severity.val} grow={false}>
            <EuiButtonEmpty
              size="xs"
              aria-label={i18n.translate(
                'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.severityLegendControl.anomalyScoreButtonLabel',
                {
                  defaultMessage: 'Anomaly score {range}',
                  values: { range: getSeverityRangeDisplayV2(severity.val) },
                }
              )}
              onClick={() => handleSeverityClick(severity)}
              css={severityButtonCss}
              data-test-subj={`${dataTestSubj}-item-${severity.val}`}
            >
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    aria-hidden={true}
                    type={isSelected ? 'dot' : 'eyeSlash'}
                    color={isSelected ? severity.color : euiTheme.colors.textDisabled}
                    size={isSelected ? 'm' : 's'}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" css={severityTextCss(isSelected)}>
                    {getSeverityRangeDisplayV2(severity.val)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiButtonEmpty>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );

  return (
    <EuiFormControlLayout
      compressed
      prepend={i18n.translate(
        'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.severityLegendControl.anomalyScoreLabel',
        { defaultMessage: 'Anomaly score' }
      )}
      fullWidth
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem css={severityControlCss}>{severityControl}</EuiFlexItem>
    </EuiFormControlLayout>
  );
};
