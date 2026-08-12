/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  euiShadowSmall,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';

import { getRiskLevel } from '../../../../../common/entity_analytics/risk_engine/risk_levels';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../../flyout/entity_details/shared/constants';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { formatRiskScore } from '../../../common/utils';
import { EntityIconByType } from '../../entity_store/entity_icon_by_type';
import { ENTITY_ANALYTICS_TABLE_ID } from '../constants';
import { getRiskScoreColors } from '../entities_table/risk_score_cell';
import type {
  ActiveFilter,
  AttentionEntry,
  AttentionReason,
  FaceliftIdentity,
  PageFilters,
} from './data';
import { ATTENTION_RANKING_EXPLANATION, getAttentionList, riskDeltaPercent } from './data';

export interface NeedsAttentionPanelProps {
  activeFilter: ActiveFilter | null;
  pageFilters: PageFilters;
  onSelectIdentity: (identity: FaceliftIdentity) => void;
}

const RiskScoreBadge: React.FC<{ riskScore: number }> = ({ riskScore }) => {
  const { euiTheme } = useEuiTheme();
  const colors = getRiskScoreColors(euiTheme, getRiskLevel(riskScore));

  return (
    <EuiBadge color={colors.background}>
      <EuiText
        size="xs"
        color={colors.text}
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        {formatRiskScore(riskScore)}
      </EuiText>
    </EuiBadge>
  );
};

/** Positive change = worse (danger, sort up); negative = better (success, sort down). */
const RiskDelta: React.FC<{ percent: number }> = ({ percent }) => {
  if (percent === 0) {
    return (
      <EuiText size="xs">
        <EuiTextColor color="subdued">{'—'}</EuiTextColor>
      </EuiText>
    );
  }

  const worse = percent > 0;
  return (
    <EuiText size="xs">
      <EuiTextColor color={worse ? 'danger' : 'success'}>
        <EuiIcon type={worse ? 'sortUp' : 'sortDown'} size="s" aria-hidden={true} />
        {` ${Math.abs(percent)}%`}
      </EuiTextColor>
    </EuiText>
  );
};

const ReasonBadge: React.FC<{ reason: AttentionReason }> = ({ reason }) => (
  <EuiBadge
    color="hollow"
    iconSide="left"
    iconType={reason.trend ? (reason.trend === 'up' ? 'sortUp' : 'sortDown') : undefined}
  >
    {reason.label}
  </EuiBadge>
);

const AttentionRow: React.FC<{
  rank: number;
  entry: AttentionEntry;
  selected: boolean;
  onSelect: () => void;
  onOpenDetails: (identity: FaceliftIdentity) => void;
}> = ({ rank, entry, selected, onSelect, onOpenDetails }) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const { identity, reasons } = entry;

  const openDetails = useCallback(
    (event: React.MouseEvent) => {
      // The row itself filters the table; the name opens the entity flyout.
      event.stopPropagation();
      onOpenDetails(identity);
    },
    [identity, onOpenDetails]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect();
      }
    },
    [onSelect]
  );

  return (
    <EuiPanel
      // A div rather than the default button, so the entity name can be its own control.
      element="div"
      hasBorder={false}
      hasShadow={false}
      paddingSize="s"
      color={selected ? 'primary' : 'transparent'}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Filter entities table to ${identity.name}`}
      data-test-subj={`eaFaceliftAttentionRow-${identity.id}`}
      css={css`
        cursor: pointer;
        border-radius: 0;
        border-bottom: ${euiTheme.border.thin};
        transition: box-shadow ${euiTheme.animation.fast} ease-in;

        &:hover {
          ${euiShadowSmall(euiThemeContext)}
        }
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {rank}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon
                type={EntityIconByType[identity.entityType]}
                size="s"
                color="subdued"
                aria-hidden={true}
              />
            </EuiFlexItem>
            <EuiFlexItem
              css={css`
                min-width: 0;
              `}
            >
              <EuiText size="s" className="eui-textTruncate">
                <EuiLink
                  onClick={openDetails}
                  title={identity.name}
                  data-test-subj={`eaFaceliftAttentionRowName-${identity.id}`}
                >
                  {identity.name}
                </EuiLink>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xs" />

          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            {reasons.map((reason) => (
              <EuiFlexItem grow={false} key={reason.label}>
                <ReasonBadge reason={reason} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <RiskScoreBadge riskScore={identity.riskScore} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <RiskDelta percent={riskDeltaPercent(identity)} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

/** Row 2, left panel — ranked list of entities that most need investigation. */
export const NeedsAttentionPanel: React.FC<NeedsAttentionPanelProps> = ({
  activeFilter,
  pageFilters,
  onSelectIdentity,
}) => {
  const entries = useMemo(() => getAttentionList(pageFilters), [pageFilters]);

  const enableNewFlyout = useIsNewFlyoutEnabled();
  const { openFlyout } = useExpandableFlyoutApi();
  const { openEntityFlyout } = useFlyoutApi();

  const onOpenDetails = useCallback(
    (identity: FaceliftIdentity) => {
      const sharedParams = {
        entityId: identity.id,
        contextID: ENTITY_ANALYTICS_TABLE_ID,
        scopeId: ENTITY_ANALYTICS_TABLE_ID,
      };

      if (enableNewFlyout) {
        openEntityFlyout({
          engineType: identity.entityType,
          entityName: identity.name,
          origin: FLYOUT_ORIGIN.ENTITIES_TABLE,
          ...sharedParams,
        });
        return;
      }

      const panelKey = EntityPanelKeyByType[identity.entityType];
      const paramName = EntityPanelParamByType[identity.entityType];
      if (panelKey && paramName) {
        openFlyout({
          right: { id: panelKey, params: { [paramName]: identity.name, ...sharedParams } },
        });
      }
    },
    [enableNewFlyout, openEntityFlyout, openFlyout]
  );

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="eaFaceliftNeedsAttentionPanel">
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>{'Needs attention'}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="info"
            position="right"
            content={ATTENTION_RANKING_EXPLANATION}
            aria-label="How this list is ranked"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {entries.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="eaFaceliftNeedsAttentionEmpty">
          {'No entities need attention with the current filters.'}
        </EuiText>
      ) : (
        entries.map((entry, index) => (
          <AttentionRow
            key={entry.identity.id}
            rank={index + 1}
            entry={entry}
            selected={
              activeFilter?.type === 'identity' && activeFilter.identityId === entry.identity.id
            }
            onSelect={() => onSelectIdentity(entry.identity)}
            onOpenDetails={onOpenDetails}
          />
        ))
      )}
    </EuiPanel>
  );
};
