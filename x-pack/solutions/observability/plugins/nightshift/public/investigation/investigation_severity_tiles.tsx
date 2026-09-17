/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, type SerializedStyles } from '@emotion/react';
import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  type EuiPanelProps,
  EuiSkeletonTitle,
  EuiText,
  EuiTitle,
  type EuiThemeComputed,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Severity, SeverityCounts } from '@kbn/nightshift-investigations-plugin/common';
import { getSeverityLabel, SEVERITY_OPTIONS } from '@kbn/significant-events-schema';
import { SEVERITY_DOT_COLOR } from '../common/severity';

/** A muted tier has no section to scroll to, so its tile reads as a figure rather than a control. */
type SeverityTileState = 'muted' | 'interactive';

interface SeverityTileStateStyles {
  /** `EuiPanel`'s `color` prop, since the two states differ in panel fill as well as in CSS. */
  panelColor: EuiPanelProps['color'];
  panel?: SerializedStyles;
  count?: SerializedStyles;
}

/** Every visual difference between a muted and an interactive tile, in one place. */
const getSeverityTileStyles = (
  euiTheme: EuiThemeComputed
): {
  label: SerializedStyles;
  countSkeleton: SerializedStyles;
  byState: Readonly<Record<SeverityTileState, SeverityTileStateStyles>>;
} => ({
  label: css`
    font-weight: ${euiTheme.font.weight.medium};
    margin-bottom: ${euiTheme.size.s};
  `,
  countSkeleton: css`
    inline-size: ${euiTheme.size.xl};
  `,
  byState: {
    muted: {
      panelColor: 'subdued',
      count: css`
        color: ${euiTheme.colors.textSubdued};
      `,
    },
    interactive: {
      panelColor: undefined,
      panel: css`
        text-align: left;
        outline: ${euiTheme.border.width.thick} solid transparent;
        transition: outline ${euiTheme.animation.fast} ease;
        &:hover {
          outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
        }
      `,
    },
  },
});

export interface InvestigationSeverityTilesProps {
  severityCounts: SeverityCounts;
  scrollableSeverities: ReadonlySet<Severity>;
  isLoading: boolean;
  onSeverityClick: (severity: Severity) => void;
}

export const InvestigationSeverityTiles = ({
  severityCounts,
  scrollableSeverities,
  isLoading,
  onSeverityClick,
}: InvestigationSeverityTilesProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => getSeverityTileStyles(euiTheme), [euiTheme]);

  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      {SEVERITY_OPTIONS.map((severity) => {
        const count = severityCounts[severity];
        const isMuted = !scrollableSeverities.has(severity);
        const stateStyles = styles.byState[isMuted ? 'muted' : 'interactive'];

        return (
          <EuiFlexItem key={severity}>
            <EuiPanel
              hasBorder
              hasShadow={false}
              paddingSize="m"
              color={stateStyles.panelColor}
              data-test-subj={`nightshiftSeverityTile-${severity}`}
              onClick={isMuted ? undefined : () => onSeverityClick(severity)}
              css={stateStyles.panel}
            >
              <EuiText color="subdued" size="xs" css={styles.label}>
                {getSeverityLabel(severity)}
              </EuiText>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="dot" color={SEVERITY_DOT_COLOR[severity]} aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSkeletonTitle
                    size="s"
                    isLoading={isLoading}
                    contentAriaLabel={i18n.translate(
                      'xpack.nightshift.investigations.severityTileCountAriaLabel',
                      {
                        defaultMessage: '{severityLabel} investigation count',
                        values: { severityLabel: getSeverityLabel(severity) },
                      }
                    )}
                    css={styles.countSkeleton}
                  >
                    <EuiTitle size="s" css={stateStyles.count}>
                      <span data-test-subj={`nightshiftSeverityTileCount-${severity}`}>
                        {count}
                      </span>
                    </EuiTitle>
                  </EuiSkeletonTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
