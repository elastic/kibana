/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { MitreNodeSummary, MitreTacticSummary } from '../../../common/detonate';
import { useNavigateToDetonationAlerts } from '../hooks/use_navigate_to_detonation_alerts';
import {
  MITRE_ALERT_COUNT,
  MITRE_ALERTS_TOOLTIP,
  MITRE_REFERENCE_TOOLTIP,
  MITRE_SUBTITLE,
  MITRE_TITLE,
} from '../translations';

/**
 * Tactics are laid out as columns rather than one long list so the kill chain reads left to right,
 * the way the coverage overview presents it. The bounds keep a tactic with a single short technique
 * from collapsing to a sliver next to one with ten.
 */
const tacticColumnStyles = css`
  min-width: 200px;
  max-width: 320px;
`;

/** Links a node to its attack.mitre.org page, degrading to plain text when there is no reference. */
const MitreReference: React.FC<{ node: MitreNodeSummary; size?: 's' | 'xs' }> = ({
  node,
  size = 's',
}) => {
  const label = `${node.name} (${node.id})`;

  if (!node.reference) {
    return (
      <EuiText size={size} color="subdued">
        {label}
      </EuiText>
    );
  }

  // The text wrapper stays outside the link so the anchor keeps its inline flow, and outside the
  // tooltip so the tooltip still hangs off something focusable.
  return (
    <EuiText size={size}>
      <EuiToolTip content={MITRE_REFERENCE_TOOLTIP(node.name)}>
        <EuiLink href={node.reference} target="_blank" data-test-subj="detonateMitreReference">
          {label}
        </EuiLink>
      </EuiToolTip>
    </EuiText>
  );
};

interface MitrePanelProps {
  tactics: MitreTacticSummary[];
  isLoading: boolean;
  /** Scopes a technique pivot to this detonation. */
  agentId: string | null;
  /** Detonation time, so the Alerts page opens on a range that contains these alerts. */
  timestamp: string | null;
}

const MitrePanelComponent: React.FC<MitrePanelProps> = ({
  tactics,
  isLoading,
  agentId,
  timestamp,
}) => {
  const { euiTheme } = useEuiTheme();
  const { navigateToAlerts } = useNavigateToDetonationAlerts();

  const openTechniqueAlerts = useCallback(
    (techniqueId: string) => navigateToAlerts({ agentId, techniqueId, timestamp }),
    [navigateToAlerts, agentId, timestamp]
  );

  // Most detonations map to no tactics at all, so a panel holding an empty state would read as a
  // detection gap on a page whose point is the opposite. Nothing renders until there is something
  // to show, which also keeps the loading pass from flashing a placeholder that usually goes away.
  if (isLoading || tactics.length === 0) {
    return null;
  }

  return (
    <>
      <EuiPanel hasBorder paddingSize="m" data-test-subj="detonateMitrePanel">
        <EuiTitle size="xs">
          <h3>{MITRE_TITLE}</h3>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {MITRE_SUBTITLE}
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFlexGroup gutterSize="l" wrap responsive={false}>
          {tactics.map((tactic) => (
            <EuiFlexItem key={tactic.id} grow={false} css={tacticColumnStyles}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
                <EuiFlexItem grow={false}>
                  <strong>
                    <MitreReference node={tactic} />
                  </strong>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {/* A tactic has no pivot of its own, so the badge is focusable purely so the
                      count it abbreviates stays reachable from the keyboard. */}
                  <EuiToolTip content={MITRE_ALERT_COUNT(tactic.alertCount)}>
                    <EuiBadge
                      color="hollow"
                      tabIndex={0}
                      aria-label={MITRE_ALERT_COUNT(tactic.alertCount)}
                    >
                      {tactic.alertCount}
                    </EuiBadge>
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="xs" />

              {tactic.techniques.map((technique) => (
                <div key={technique.id} css={{ marginLeft: euiTheme.size.s }}>
                  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
                    <EuiFlexItem grow={false}>
                      <MitreReference node={technique} size="xs" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip content={MITRE_ALERTS_TOOLTIP(technique.name)}>
                        <EuiBadge
                          color="hollow"
                          onClick={() => openTechniqueAlerts(technique.id)}
                          onClickAriaLabel={MITRE_ALERTS_TOOLTIP(technique.name)}
                          data-test-subj="detonateMitreTechniqueAlerts"
                        >
                          {technique.alertCount}
                        </EuiBadge>
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  {technique.subtechniques.map((subtechnique) => (
                    <div key={subtechnique.id} css={{ marginLeft: euiTheme.size.m }}>
                      <MitreReference node={subtechnique} size="xs" />
                    </div>
                  ))}
                </div>
              ))}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPanel>

      {/* Owned here rather than by the page so hiding the panel does not leave a double gap. */}
      <EuiSpacer size="l" />
    </>
  );
};

export const MitrePanel = React.memo(MitrePanelComponent);
