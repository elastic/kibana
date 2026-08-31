/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextTruncate,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';
import { BLAST_RADIUS_LABELS } from './translations';

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
      <EuiTitle size="xxs" css={css({ fontWeight: euiTheme.font.weight.semiBold })}>
        <h3>{BLAST_RADIUS_LABELS.title}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup
        gutterSize="s"
        wrap
        responsive={false}
        alignItems="center"
        aria-label={BLAST_RADIUS_LABELS.title}
      >
        {surfaces.map((surface) => (
          <EuiFlexItem key={surface} grow={false}>
            <EuiBadge
              style={{ padding: euiTheme.size.xs, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              color={surfaceFilter === surface ? 'primary' : 'hollow'}
              onClick={() => onSurfaceFilterChange(surfaceFilter === surface ? null : surface)}
              onClickAriaLabel={surface}
            >
              <EuiFlexGroup
                gutterSize="none"
                alignItems="center"
                responsive={false}
                direction="row"
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" style={{ padding: `0 ${euiTheme.size.xs}` }}>
                    <EuiTextTruncate text={surface} width={120} truncation="end" />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="primary">
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
