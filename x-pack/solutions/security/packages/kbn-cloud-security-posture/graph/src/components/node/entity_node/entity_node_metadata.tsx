/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { Ips } from '../ips/ips';
import { CountryFlags } from '../country_flags/country_flags';
import { EntityIds } from '../entity_ids/entity_ids';
import type { EntityRiskScore, EntityAssetCriticality } from '../../types';
import {
  GRAPH_ENTITY_NODE_METADATA_ID,
  GRAPH_ENTITY_NODE_ENTITY_ID_ROW_ID,
  GRAPH_ENTITY_NODE_RISK_SCORE_ID,
  GRAPH_ENTITY_NODE_ASSET_CRITICALITY_ID,
} from '../../test_ids';

export interface EntityNodeMetadataProps {
  ips?: string[];
  countryCodes?: string[];
  entityIds?: string[];
  riskScore?: EntityRiskScore;
  assetCriticality?: EntityAssetCriticality;
  onIpClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onCountryClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onEntityIdClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const IP_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.ipAddress', {
  defaultMessage: 'IP address',
});
const GEO_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.geolocation', {
  defaultMessage: 'Geolocation',
});
const ENTITY_ID_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.entityId', {
  defaultMessage: 'Entity ID',
});
const CRITICALITY_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.assetCriticality',
  { defaultMessage: 'Asset criticality' }
);
const RISK_SCORE_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.riskScore', {
  defaultMessage: 'Risk score',
});
const EXTREME_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.extreme', {
  defaultMessage: 'extreme',
});
const HIGH_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.high', {
  defaultMessage: 'high',
});
const MEDIUM_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.medium', {
  defaultMessage: 'medium',
});
const LOW_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.low', {
  defaultMessage: 'low',
});

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <EuiText size="xs">
    <strong>{children}</strong>
  </EuiText>
);

export const EntityNodeMetadata = ({
  ips,
  countryCodes,
  entityIds,
  riskScore,
  assetCriticality,
  onIpClick,
  onCountryClick,
  onEntityIdClick,
}: EntityNodeMetadataProps) => {
  const { euiTheme } = useEuiTheme();

  const hasIps = ips !== undefined && ips.length > 0;
  const hasFlags = countryCodes !== undefined && countryCodes.length > 0;
  const hasEntityIds = entityIds !== undefined && entityIds.length > 0;
  const hasRisk =
    riskScore !== undefined &&
    (riskScore.value !== undefined || (riskScore.min !== undefined && riskScore.max !== undefined));

  const criticalityLevels: Array<{ color: string; count: number; label: string }> = [];
  if (assetCriticality) {
    if (assetCriticality.extreme !== undefined)
      criticalityLevels.push({
        color: 'danger',
        count: assetCriticality.extreme,
        label: EXTREME_LABEL,
      });
    if (assetCriticality.high !== undefined)
      criticalityLevels.push({
        color: euiTheme.colors.textAccent,
        count: assetCriticality.high,
        label: HIGH_LABEL,
      });
    if (assetCriticality.medium !== undefined)
      criticalityLevels.push({
        color: 'warning',
        count: assetCriticality.medium,
        label: MEDIUM_LABEL,
      });
    if (assetCriticality.low !== undefined)
      criticalityLevels.push({ color: 'subdued', count: assetCriticality.low, label: LOW_LABEL });
  }
  const hasCriticality = criticalityLevels.length > 0;

  return (
    <EuiFlexGroup
      data-test-subj={GRAPH_ENTITY_NODE_METADATA_ID}
      direction="column"
      gutterSize="m"
      css={css`
        padding: ${euiTheme.size.s};
        background-color: ${euiTheme.colors.backgroundBasePlain};
        white-space: nowrap;
        /* Sit above the node's full-card click overlay (z-index 1) so the IP /
           geolocation / entity-id "+N" buttons remain clickable. */
        position: relative;
        z-index: 2;
      `}
    >
      {hasIps || hasFlags ? (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m">
            {hasIps ? (
              <EuiFlexItem>
                <FieldLabel>{IP_LABEL}</FieldLabel>
                <Ips ips={ips} onIpClick={onIpClick} />
              </EuiFlexItem>
            ) : null}
            {hasFlags ? (
              <EuiFlexItem>
                <FieldLabel>{GEO_LABEL}</FieldLabel>
                <CountryFlags countryCodes={countryCodes} onCountryClick={onCountryClick} />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}

      {hasEntityIds ? (
        <EuiFlexItem
          grow={false}
          data-test-subj={GRAPH_ENTITY_NODE_ENTITY_ID_ROW_ID}
          css={css`
            width: 100%;
            min-width: 0;
          `}
        >
          <FieldLabel>{ENTITY_ID_LABEL}</FieldLabel>
          <EntityIds entityIds={entityIds ?? []} onEntityIdClick={onEntityIdClick} />
        </EuiFlexItem>
      ) : null}

      {hasCriticality ? (
        <EuiFlexItem grow={false} data-test-subj={GRAPH_ENTITY_NODE_ASSET_CRITICALITY_ID}>
          <FieldLabel>{CRITICALITY_LABEL}</FieldLabel>
          <EuiFlexGroup gutterSize="s" wrap>
            {criticalityLevels.map((lvl) => (
              <EuiFlexItem grow={false} key={lvl.label}>
                <EuiHealth color={lvl.color}>{`${lvl.count} ${lvl.label}`}</EuiHealth>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}

      {hasRisk ? (
        <EuiFlexItem grow={false} data-test-subj={GRAPH_ENTITY_NODE_RISK_SCORE_ID}>
          <FieldLabel>{RISK_SCORE_LABEL}</FieldLabel>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            {riskScore?.value !== undefined ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{riskScore.value}</EuiBadge>
              </EuiFlexItem>
            ) : (
              <>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{riskScore?.min}</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">{'–'}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="danger">{riskScore?.max}</EuiBadge>
                </EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

EntityNodeMetadata.displayName = 'EntityNodeMetadata';
