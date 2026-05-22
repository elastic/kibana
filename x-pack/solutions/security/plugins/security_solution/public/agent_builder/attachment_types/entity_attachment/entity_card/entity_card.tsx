/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiPanel, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RiskSeverity, RiskStats } from '../../../../../common/search_strategy';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { useEntityForAttachment } from '../use_entity_for_attachment';
import type { EntityAttachmentIdentifier, EntityAttachmentRiskStats } from '../types';
import { useEntityAnalyticsAgentNavigation } from '../../entity_analytics_agent_navigation_context';
import { IdentityHeader } from './identity_header';
import { EntitySummaryGridMini } from './entity_summary_grid';
import { RiskSummaryMini } from './risk_summary_mini';
import { ResolutionMini } from './resolution_mini';
import { EntityCardActions } from './entity_card_actions';

interface EntityCardProps {
  identifier: EntityAttachmentIdentifier;
  /**
   * Risk breakdown embedded on the attachment payload by
   * `security.get_entity`. When present, the card prefers these over the
   * (far more limited) stats available on the entity store record so the
   * contributions table mirrors the full flyout.
   */
  riskStats?: EntityAttachmentRiskStats;
  /**
   * Resolution-group risk breakdown embedded on the attachment payload
   * when the entity is part of a multi-member resolution group. Drives the
   * "Resolution group risk score" block in `RiskSummaryMini`.
   */
  resolutionRiskStats?: EntityAttachmentRiskStats;
  watchlistsEnabled: boolean;
  privmonModifierEnabled: boolean;
}

/**
 * Projects the embedded `EntityAttachmentRiskStats` (a subset of
 * `EntityRiskScoreRecord`) into the full `RiskStats` shape `RiskSummaryMini`
 * expects. `rule_risks`/`multipliers` aren't surfaced on the attachment
 * today — defaulting them to empty arrays matches what the entity-store
 * shaping hook does and keeps the contributions table render-safe.
 */
const toRiskStats = (stats: EntityAttachmentRiskStats | undefined): RiskStats | undefined => {
  if (!stats) return undefined;
  return {
    ...stats,
    rule_risks: [],
    multipliers: [],
  } as unknown as RiskStats;
};

const identifierTypeToEntityType = (
  type: EntityAttachmentIdentifier['identifierType']
): EntityType => {
  switch (type) {
    case 'host':
      return EntityType.host;
    case 'user':
      return EntityType.user;
    case 'service':
      return EntityType.service;
    case 'generic':
    default:
      return EntityType.generic;
  }
};

/**
 * Rich entity card shown inside an agent chat message. When the entity is
 * in the entity store, we mirror the user/host details flyout layout
 * (identity header → summary grid → risk summary → resolution group),
 * rebuilt with lightweight hooks so the card stays decoupled from the
 * Security Solution Redux/expandable-flyout providers. Follow-up actions
 * other than "Open in Entity Analytics" are driven from the agent side.
 */
export const EntityCard: React.FC<EntityCardProps> = ({
  identifier,
  riskStats: attachmentRiskStats,
  resolutionRiskStats: attachmentResolutionRiskStats,
  watchlistsEnabled,
  privmonModifierEnabled,
}) => {
  const { isLoading, error, data } = useEntityForAttachment(identifier);
  const { canNavigate } = useEntityAnalyticsAgentNavigation();

  // Prefer attachment-supplied risk stats (full breakdown from the risk
  // index) over the entity-store-derived stats (score/level only). Falls
  // back to the entity store for older attachments persisted before the
  // payload was widened, so they keep rendering as before.
  const effectiveRiskStats = useMemo(
    () => toRiskStats(attachmentRiskStats) ?? data?.riskStats,
    [attachmentRiskStats, data?.riskStats]
  );
  const effectiveResolutionRiskStats = useMemo(
    () => toRiskStats(attachmentResolutionRiskStats),
    [attachmentResolutionRiskStats]
  );

  if (isLoading && !data) {
    return (
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
        <EuiSkeletonText lines={4} data-test-subj="entityAttachmentCardSkeleton" />
      </EuiPanel>
    );
  }

  const fallback = {
    entityType: identifierTypeToEntityType(identifier.identifierType),
    displayName: identifier.identifier,
    entityId: undefined as string | undefined,
    isEntityInStore: false,
    firstSeen: null as string | null,
    lastSeen: null as string | null,
    riskScore: undefined as number | undefined,
    riskLevel: undefined,
    riskStats: undefined,
    assetCriticality: undefined,
    watchlistIds: [] as string[],
    sources: [] as string[],
  };

  if (error && !data) {
    return (
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        paddingSize="m"
        data-test-subj="entityAttachmentCard"
      >
        <EuiCallOut
          announceOnMount
          size="s"
          color="warning"
          iconType="warning"
          title={i18n.translate(
            'xpack.securitySolution.agentBuilder.entityAttachment.card.errorTitle',
            { defaultMessage: 'Could not load entity details' }
          )}
          data-test-subj="entityAttachmentCardError"
        >
          {i18n.translate(
            'xpack.securitySolution.agentBuilder.entityAttachment.card.errorDescription',
            {
              defaultMessage:
                'We could not reach the entity store. The entity identifier is still available for the agent.',
            }
          )}
        </EuiCallOut>
        <EuiSpacer size="s" />
        <IdentityHeader
          displayName={fallback.displayName}
          entityType={fallback.entityType}
          isEntityInStore={false}
          hasLastSeenDate={false}
        />
        {canNavigate && <EntityCardActions identifier={identifier} />}
      </EuiPanel>
    );
  }

  const resolved = data ?? fallback;
  const source = resolved.sources[0];

  // Derive the resolution-group score/level from the embedded risk doc so
  // `RiskSummaryMini` renders the resolution block (`showResolution`
  // flips on whenever any of these three fields is set).
  const resolutionRiskScore = attachmentResolutionRiskStats?.calculated_score_norm;
  const resolutionRiskLevel = attachmentResolutionRiskStats?.calculated_level as
    | RiskSeverity
    | undefined;

  const hasRiskSummary =
    effectiveRiskStats != null ||
    resolved.riskScore != null ||
    effectiveResolutionRiskStats != null ||
    resolutionRiskScore != null ||
    resolutionRiskLevel != null;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="m"
      data-test-subj="entityAttachmentCard"
    >
      <IdentityHeader
        displayName={resolved.displayName}
        entityType={resolved.entityType}
        isEntityInStore={resolved.isEntityInStore}
        hasLastSeenDate={Boolean(resolved.lastSeen)}
        assetCriticality={resolved.assetCriticality}
        riskLevel={resolved.riskLevel}
      />
      {resolved.isEntityInStore && (
        <>
          <EuiSpacer size="s" />
          <EntitySummaryGridMini
            entityId={resolved.entityId}
            source={source}
            assetCriticality={resolved.assetCriticality}
            watchlistIds={resolved.watchlistIds}
            watchlistsEnabled={watchlistsEnabled}
          />
          {hasRiskSummary && (
            <>
              <EuiSpacer size="m" />
              <RiskSummaryMini
                entityType={resolved.entityType}
                displayName={resolved.displayName}
                riskScore={resolved.riskScore}
                riskLevel={resolved.riskLevel}
                riskStats={effectiveRiskStats}
                resolutionRiskScore={resolutionRiskScore}
                resolutionRiskLevel={resolutionRiskLevel}
                resolutionRiskStats={effectiveResolutionRiskStats}
                privmonModifierEnabled={privmonModifierEnabled}
                watchlistEnabled={watchlistsEnabled}
              />
            </>
          )}
          {resolved.entityId && (
            <>
              <EuiSpacer size="m" />
              <ResolutionMini
                entityStoreEntityId={resolved.entityId}
                currentEntityStoreEntityId={resolved.entityId}
              />
            </>
          )}
        </>
      )}
      <EntityCardActions identifier={identifier} />
    </EuiPanel>
  );
};
