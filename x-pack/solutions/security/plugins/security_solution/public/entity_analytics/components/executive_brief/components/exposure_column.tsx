/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type {
  BriefEntity,
  BriefSnapshot,
  Storyline,
} from '../../../../../common/entity_analytics/executive_brief/types';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import { AssetCriticalityBadge } from '../../asset_criticality/asset_criticality_badge';
import { RiskScoreLevel } from '../../severity/common';

const CRITICALITY_LEVELS: readonly string[] = [
  'extreme_impact',
  'high_impact',
  'medium_impact',
  'low_impact',
];

const toCriticality = (value: string | undefined): CriticalityLevelWithUnassigned =>
  value && CRITICALITY_LEVELS.includes(value)
    ? (value as CriticalityLevelWithUnassigned)
    : 'unassigned';

/** Risk, criticality, privilege, vulnerability and watchlist facts of one entity (no name). */
export const EntityExposureFacts: React.FC<{ entity: BriefEntity }> = ({ entity }) => {
  const vulns = entity.vulnerabilities;
  return (
    <div data-test-subj={`executiveBriefExposure-${entity.name}`}>
      <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
        {entity.riskLevel && entity.riskScoreNorm !== undefined && (
          <EuiFlexItem grow={false}>
            <RiskScoreLevel severity={entity.riskLevel} />
          </EuiFlexItem>
        )}
        {entity.riskScoreNorm !== undefined && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{Math.round(entity.riskScoreNorm)}</EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <AssetCriticalityBadge criticalityLevel={toCriticality(entity.criticality)} />
        </EuiFlexItem>
        {entity.isPrivileged && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" iconType="user">
              {'Privileged'}
            </EuiBadge>
          </EuiFlexItem>
        )}
        {vulns && vulns.critical > 0 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="danger">{`${vulns.critical} critical CVE`}</EuiBadge>
          </EuiFlexItem>
        )}
        {vulns && vulns.high > 0 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning">{`${vulns.high} high CVE`}</EuiBadge>
          </EuiFlexItem>
        )}
        {entity.watchlists.map((watchlist) => (
          <EuiFlexItem grow={false} key={watchlist}>
            <EuiBadge color="hollow">{watchlist}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};

const EntityExposure: React.FC<{ entity: BriefEntity }> = ({ entity }) => (
  <div>
    <EuiText size="xs">
      <strong>{entity.name}</strong>
    </EuiText>
    <EntityExposureFacts entity={entity} />
  </div>
);

/** Fallback list of exposure facts, used only when the relationship diagram cannot render. */
export const ExposureColumn: React.FC<{ storyline: Storyline; snapshot: BriefSnapshot }> = ({
  storyline,
  snapshot,
}) => (
  <div data-test-subj="executiveBriefExposureColumn">
    <EuiTitle size="xxs">
      <h5>{'Exposure'}</h5>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiFlexGroup direction="column" gutterSize="s">
      {storyline.entityEuids.map((euid) => {
        const entity = snapshot.entities[euid];
        return entity ? (
          <EuiFlexItem key={euid} grow={false}>
            <EntityExposure entity={entity} />
          </EuiFlexItem>
        ) : null;
      })}
    </EuiFlexGroup>
  </div>
);
