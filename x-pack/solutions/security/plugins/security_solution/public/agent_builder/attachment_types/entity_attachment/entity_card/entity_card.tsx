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
import { RiskSummaryRow } from './risk_summary_row';
import { KeyFieldsList } from './key_fields_list';
import { WatchlistsList } from './watchlists_list';
import { EntityCardActions } from './entity_card_actions';

interface EntityCardProps {
  identifier: EntityAttachmentIdentifier;
  watchlistsEnabled: boolean;
  setComposerContent?: (text: string) => void;
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

export const EntityCard: React.FC<EntityCardProps> = ({
  identifier,
  watchlistsEnabled,
  setComposerContent,
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
        <EntityCardActions identifier={identifier} setComposerContent={setComposerContent} />
      </EuiPanel>
    );
  }

  const resolved = data ?? fallback;

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
      />
      <RiskSummaryRow riskScore={resolved.riskScore} riskLevel={resolved.riskLevel} />
      <KeyFieldsList
        firstSeen={resolved.firstSeen}
        lastSeen={resolved.lastSeen}
        sources={resolved.sources}
        entityId={resolved.entityId}
      />
      {watchlistsEnabled && <WatchlistsList watchlistIds={resolved.watchlistIds} />}
      <EntityCardActions identifier={identifier} setComposerContent={setComposerContent} />
    </EuiPanel>
  );
};
