/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import type { TimeRange } from '../../../../../common/entity_analytics/home/constants';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import { MAX_ENTITY_IDS_PER_TILE } from '../../../../../common/entity_analytics/ai_brief/scope';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import type { SignalCardData, SignalCardId } from '../needs_attention_tiles/data';
import type { EntityFilters } from '../entities_grid/common';

/**
 * What the "Generate AI brief" button needs: whether the user can use Agent Builder, whether the page's
 * counts are still loading, and the action that captures the view and opens Agent Builder on it.
 */
export const useGenerateAiBriefAction = ({
  cards,
  timeRange,
  entityFilters,
  focusTileId,
}: {
  cards: SignalCardData[];
  timeRange: TimeRange;
  entityFilters: EntityFilters;
  focusTileId?: SignalCardId;
}): { isAvailable: boolean; isLoading: boolean; open: () => void } => {
  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();

  const scope = useMemo(
    () => captureScope({ cards, timeRange, entityFilters, focusTileId }),
    [cards, timeRange, entityFilters, focusTileId]
  );
  const { openAgentBuilderFlyout } = useAgentBuilderAttachment({
    attachmentType: SecurityAgentBuilderAttachments.entityAnalyticsAiBrief,
    attachmentData: scope,
    attachmentDescription: i18n.translate(
      'xpack.securitySolution.entityAnalytics.home.aiBrief.attachmentDescription',
      { defaultMessage: 'Entity Analytics view (last {timeRange})', values: { timeRange } }
    ),
    attachmentPrompt: 'Generate the Entity Analytics brief for the attached view.',
    autoSendInitialMessage: true,
  });

  const isLoading = isWaitingForCounts(cards);
  return useMemo(
    () => ({ isAvailable: isAgentBuilderEnabled, isLoading, open: openAgentBuilderFlyout }),
    [isAgentBuilderEnabled, isLoading, openAgentBuilderFlyout]
  );
};

/**
 * True while a count or its change is loading, so the brief never reads a loading delta as missing.
 * A count that can't be read is not waited for: a disabled query, such as anomalies without ML jobs,
 * reports loading for good.
 */
export const isWaitingForCounts = (cards: SignalCardData[]): boolean =>
  cards.some(
    ({ isUnavailable, isLoading, isDeltaLoading }) =>
      !isUnavailable && Boolean(isLoading || isDeltaLoading)
  );

/** The view as the brief's scope: the tiles as shown, and the entity filters that apply. */
const captureScope = ({
  cards,
  timeRange,
  entityFilters,
  focusTileId,
}: {
  cards: SignalCardData[];
  timeRange: TimeRange;
  entityFilters: EntityFilters;
  focusTileId?: SignalCardId;
}): EntityAnalyticsScope => {
  const activeEntityFilters = Object.fromEntries(
    Object.entries(entityFilters).filter(([, values]) => values.length > 0)
  );
  return {
    period: timeRange,
    // Recomputed whenever the tiles change, so this is when the captured values last changed.
    capturedAt: new Date().toISOString(),
    entityFilters: Object.keys(activeEntityFilters).length > 0 ? activeEntityFilters : undefined,
    focusTileId,
    tiles: Object.fromEntries(
      cards.map((card) => [
        card.id,
        {
          title: card.title,
          description: card.description,
          value: card.value,
          // The page shows "Not enough history" rather than a delta, so the brief has no comparison.
          delta: card.isDeltaUnavailable ? undefined : card.delta,
          unavailable: card.isUnavailable || Boolean(card.noDataMessage) || undefined,
          entityIds: (card.entityIds ?? []).slice(0, MAX_ENTITY_IDS_PER_TILE),
        },
      ])
    ),
  };
};
