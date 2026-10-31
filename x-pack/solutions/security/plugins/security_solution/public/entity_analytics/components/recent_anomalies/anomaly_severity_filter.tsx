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
  EuiHealth,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { AnomalyBand } from './anomaly_bands';

interface SeverityFilterProps {
  anomalyBands: AnomalyBand[];
  toggleHiddenBand: (band: AnomalyBand) => void;
}

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
          {'Anomaly score'}
        </p>
        {anomalyBands.map((band) => {
          if (band.hidden) {
            return (
              <EuiButtonEmpty
                key={`${band.start}-${band.end}`}
                size="xs"
                color="text"
                aria-pressed={false}
                onClick={() => toggleHiddenBand(band)}
              >
                <EuiFlexGroup alignItems={'center'} gutterSize={'xs'} responsive={false}>
                  <EuiIcon type={'eyeSlash'} aria-hidden={true} />
                  <EuiText size={'s'} color={euiTheme.colors.textSubdued}>
                    <p>{`${band.start}-${band.end}`}</p>
                  </EuiText>
                </EuiFlexGroup>
              </EuiButtonEmpty>
            );
          }
          return (
            <EuiButtonEmpty
              key={`${band.start}-${band.end}`}
              size="xs"
              color="text"
              aria-pressed={true}
              onClick={() => toggleHiddenBand(band)}
            >
              <EuiHealth color={band.color}>{`${band.start}-${band.end}`}</EuiHealth>
            </EuiButtonEmpty>
          );
        })}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
