/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { AnomalyBand } from './pad_anomaly_bands';

interface SeverityFilterProps {
  anomalyBands: AnomalyBand[];
  toggleHiddenBand: (band: AnomalyBand) => void;
}

export const PrivilegedAccessDetectionSeverityFilter: React.FC<SeverityFilterProps> = ({
  anomalyBands,
  toggleHiddenBand,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup>
      <EuiPanel grow={false} hasBorder hasShadow={false}>
        <EuiFlexGroup alignItems={'center'}>
          <p css={{ fontWeight: euiTheme.font.weight.bold }}>{'Anomaly score'}</p>
          {anomalyBands.map((band) => {
            if (band.hidden) {
              return (
                <EuiFlexItem
                  key={`${band.start}-${band.end}`}
                  css={{ cursor: 'pointer' }}
                  onClick={() => toggleHiddenBand(band)}
                  grow={false}
                >
                  <EuiFlexGroup alignItems={'center'} gutterSize={'xs'}>
                    <EuiIcon type={'eyeClosed'} />
                    <EuiText size={'s'} color={euiTheme.colors.textSubdued}>
                      <p>{`${band.start}-${band.end}`}</p>
                    </EuiText>
                  </EuiFlexGroup>
                </EuiFlexItem>
              );
            }
            return (
              <EuiHealth
                key={`${band.start}-${band.end}`}
                css={{ cursor: 'pointer' }}
                onClick={() => toggleHiddenBand(band)}
                color={band.color}
              >{`${band.start}-${band.end}`}</EuiHealth>
            );
          })}
        </EuiFlexGroup>
      </EuiPanel>
      <EuiFlexItem />
    </EuiFlexGroup>
  );
};
