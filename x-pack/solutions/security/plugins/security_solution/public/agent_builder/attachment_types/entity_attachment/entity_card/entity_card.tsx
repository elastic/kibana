/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiPanel, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { useEntityForAttachment } from '../use_entity_for_attachment';
import type { EntityAttachmentIdentifier } from '../types';
import { IdentityHeader } from './identity_header';
import { EntitySummaryGridMini } from './entity_summary_grid';
import { RiskSummaryMini } from './risk_summary_mini';
import { ResolutionMini } from './resolution_mini';
import { EntityCardActions } from './entity_card_actions';

interface EntityCardProps {
  identifier: EntityAttachmentIdentifier;
  watchlistsEnabled: boolean;
  privmonModifierEnabled: boolean;
}

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
  watchlistsEnabled,
  privmonModifierEnabled,
}) => {
  const { isLoading, error, data } = useEntityForAttachment(identifier);

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
        <EntityCardActions identifier={identifier} />
      </EuiPanel>
    );
  }

  const resolved = data ?? fallback;
  const source = resolved.sources[0];

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
          {(resolved.riskStats || resolved.riskScore != null) && (
            <>
              <EuiSpacer size="m" />
              <RiskSummaryMini
                entityType={resolved.entityType}
                displayName={resolved.displayName}
                riskScore={resolved.riskScore}
                riskLevel={resolved.riskLevel}
                riskStats={resolved.riskStats}
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
