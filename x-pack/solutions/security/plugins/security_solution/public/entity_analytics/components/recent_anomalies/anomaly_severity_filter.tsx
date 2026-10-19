/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AnomalyBand } from './anomaly_bands';

interface SeverityFilterProps {
  anomalyBands: AnomalyBand[];
  toggleHiddenBand: (band: AnomalyBand) => void;
}

const ANOMALY_SCORE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.recentAnomalies.severityFilter.anomalyScoreLabel',
  { defaultMessage: 'Anomaly score' }
);

export const AnomalySeverityFilter: React.FC<SeverityFilterProps> = ({
  anomalyBands,
  toggleHiddenBand,
}) => {
  const { euiTheme } = useEuiTheme();
  const labelId = useGeneratedHtmlId({ prefix: 'anomalySeverityFilterLabel' });

  return (
    <EuiPanel paddingSize="s" grow={false} hasBorder hasShadow={false}>
      <EuiFlexGroup
        alignItems={'center'}
        responsive={false}
        wrap
        role="group"
        aria-labelledby={labelId}
      >
        <p id={labelId} css={{ fontWeight: euiTheme.font.weight.bold }}>
          {ANOMALY_SCORE_LABEL}
        </p>
        {anomalyBands.map((band) => {
          const range = `${band.start}-${band.end}`;
          return (
            <EuiFlexItem key={range} grow={false}>
              <EuiButtonEmpty
                size="xs"
                color="text"
                flush="both"
                aria-pressed={!band.hidden}
                onClick={() => toggleHiddenBand(band)}
                data-test-subj={`anomaly-severity-filter-${range}`}
              >
                <EuiFlexGroup
                  component="span"
                  alignItems={'center'}
                  gutterSize={'xs'}
                  responsive={false}
                >
                  <EuiIcon
                    type={band.hidden ? 'eyeSlash' : 'dot'}
                    color={band.hidden ? euiTheme.colors.textSubdued : band.color}
                    aria-hidden={true}
                  />
                  <EuiText
                    component="span"
                    size={'s'}
                    color={band.hidden ? euiTheme.colors.textSubdued : undefined}
                  >
                    {range}
                  </EuiText>
                </EuiFlexGroup>
              </EuiButtonEmpty>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
