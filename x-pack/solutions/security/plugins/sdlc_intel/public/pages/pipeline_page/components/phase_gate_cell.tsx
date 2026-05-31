/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiProgress,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { BAND_COLORS, type PhaseDefinition } from '../lib/phase_definitions';
import type { PhaseCellModel } from '../lib/phase_cell_model';

const getGateStyles = (
  gate: PhaseCellModel['gate'],
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']
) => {
  if (gate === 'pass') {
    return {
      background: euiTheme.colors.backgroundLightSuccess,
      color: euiTheme.colors.successText,
      icon: 'checkInCircleFilled' as const,
      label: 'Passed',
    };
  }

  if (gate === 'warn') {
    return {
      background: euiTheme.colors.backgroundLightWarning,
      color: euiTheme.colors.warningText,
      icon: 'alert' as const,
      label: 'At risk',
    };
  }

  if (gate === 'fail') {
    return {
      background: euiTheme.colors.backgroundLightDanger,
      color: euiTheme.colors.dangerText,
      icon: 'crossInACircleFilled' as const,
      label: 'Blocked',
    };
  }

  return {
    background: euiTheme.colors.lightestShade,
    color: euiTheme.colors.textSubdued,
    icon: 'dotInCircle' as const,
    label: 'Upcoming',
  };
};

export const PhaseGateCell = ({
  definition,
  cell,
  expanded,
  onToggleExpand,
}: {
  definition: PhaseDefinition;
  cell: PhaseCellModel;
  expanded: boolean;
  onToggleExpand: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const gateStyles = getGateStyles(cell.gate, euiTheme);
  const bandColors = BAND_COLORS[definition.band];

  return (
    <div
      css={css`
        padding: ${euiTheme.size.s};
        border-right: ${euiTheme.border.thin};
        background: ${bandColors.background};
        min-height: 80px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
      `}
    >
      <div
        css={css`
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${gateStyles.background};
          color: ${gateStyles.color};
          border: ${cell.gate === 'ns' ? `1.5px dashed ${euiTheme.border.color}` : 'none'};
        `}
      >
        <EuiIcon type={gateStyles.icon} size="s" />
      </div>
      <EuiText size="xs">
        <strong style={{ color: gateStyles.color }}>{gateStyles.label}</strong>
      </EuiText>
      {cell.summary ? (
        <EuiText size="xs" textAlign="center" color="subdued">
          {cell.summary}
        </EuiText>
      ) : null}
      {cell.linkUrl ? (
        <EuiLink href={cell.linkUrl} target="_blank" external>
          {cell.linkLabel}
        </EuiLink>
      ) : null}
      {cell.expandable ? (
        <EuiButtonEmpty size="xs" onClick={onToggleExpand}>
          {expanded ? (
            <FormattedMessage id="xpack.sdlcIntel.pipeline.cell.less" defaultMessage="Less" />
          ) : (
            <FormattedMessage id="xpack.sdlcIntel.pipeline.cell.more" defaultMessage="More" />
          )}
        </EuiButtonEmpty>
      ) : null}
      {expanded && cell.ticketDetails ? (
        <div css={css`width: 100%;`}>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.sdlcIntel.pipeline.cell.aiGen"
                  defaultMessage="AI-gen {count}/{total}"
                  values={{
                    count: cell.ticketDetails.aiGen,
                    total: cell.ticketDetails.total,
                  }}
                />
              </EuiText>
              <EuiProgress
                value={cell.ticketDetails.aiGen}
                max={cell.ticketDetails.total || 1}
                size="s"
                color="accent"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.sdlcIntel.pipeline.cell.validated"
                  defaultMessage="Validated {count}/{total}"
                  values={{
                    count: cell.ticketDetails.engValidated,
                    total: cell.ticketDetails.aiGen || 1,
                  }}
                />
              </EuiText>
              <EuiProgress
                value={cell.ticketDetails.engValidated}
                max={cell.ticketDetails.aiGen || 1}
                size="s"
                color="success"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.sdlcIntel.pipeline.cell.done"
                  defaultMessage="Done {count}/{total}"
                  values={{
                    count: cell.ticketDetails.done,
                    total: cell.ticketDetails.total,
                  }}
                />
              </EuiText>
              <EuiProgress
                value={cell.ticketDetails.done}
                max={cell.ticketDetails.total || 1}
                size="s"
                color="success"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ) : null}
      {expanded && cell.pullRequestDetails ? (
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="success">
              <FormattedMessage
                id="xpack.sdlcIntel.pipeline.cell.merged"
                defaultMessage="{count} merged"
                values={{ count: cell.pullRequestDetails.merged }}
              />
            </EuiBadge>
          </EuiFlexItem>
          {cell.pullRequestDetails.open > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="primary">
                <FormattedMessage
                  id="xpack.sdlcIntel.pipeline.cell.openPrs"
                  defaultMessage="{count} open"
                  values={{ count: cell.pullRequestDetails.open }}
                />
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ) : null}
    </div>
  );
};
