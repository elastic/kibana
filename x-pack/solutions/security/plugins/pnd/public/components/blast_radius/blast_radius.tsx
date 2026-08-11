/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';

interface BlastRadiusProps {
  investigations: Investigation[];
  surfaceFilter: string | null;
  onSurfaceFilterChange: (surface: string | null) => void;
}

export const BlastRadius: React.FC<BlastRadiusProps> = ({
  investigations,
  surfaceFilter,
  onSurfaceFilterChange,
}) => {
  const { euiTheme } = useEuiTheme();

  const surfaces = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const investigation of investigations) {
      const surface = investigation.affectedSurface?.trim();
      if (surface && !seen.has(surface)) {
        seen.add(surface);
        labels.push(surface);
      }
    }
    return labels;
  }, [investigations]);

  if (surfaces.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup
        gutterSize="s"
        wrap
        responsive={false}
        alignItems="center"
        aria-label="Affected surfaces"
      >
        {surfaces.map((surface) => (
          <EuiFlexItem key={surface} grow={false}>
            <EuiBadge
              style={{ padding: euiTheme.size.s }}
              color={surfaceFilter === surface ? 'primary' : 'hollow'}
              onClick={() => onSurfaceFilterChange(surfaceFilter === surface ? null : surface)}
              onClickAriaLabel={surface}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} direction="row">
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">{surface}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="danger">
                    {investigations.filter((i) => i.affectedSurface === surface).length}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
