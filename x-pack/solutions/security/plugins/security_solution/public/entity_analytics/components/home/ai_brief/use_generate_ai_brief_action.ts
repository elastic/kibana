/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderMenu } from '@kbn/app-header';
import type { Filter, Query } from '@kbn/es-query';
import type { TimeRange } from '../../../../../common/entity_analytics/home/constants';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import {
  ENTITY_ANALYTICS_AI_BRIEF_ATTACHMENT_TYPE,
  MAX_ENTITY_IDS_PER_TILE,
} from '../../../../../common/entity_analytics/ai_brief/scope';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../common/store/inputs';
import type { SignalCardData, SignalCardId } from '../needs_attention_tiles/data';
import type { EntityFilters } from '../use_entity_filters_param';

const BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.aiBrief.buttonLabel',
  { defaultMessage: 'Generate AI brief' }
);
const SCOPE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.aiBrief.scopeTooltip',
  {
    defaultMessage:
      'Headline counts follow the period and entity filters, as on the page. Your search narrows the priorities.',
  }
);

/**
 * The page header's "Generate AI brief" button: captures the page's view and opens Agent Builder on it.
 * Absent when the user can't use Agent Builder.
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
}): AppHeaderMenu['primaryActionItem'] => {
  const getGlobalQuery = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const getGlobalFilters = useMemo(() => inputsSelectors.globalFiltersQuerySelector(), []);
  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();
  const query = useDeepEqualSelector(getGlobalQuery);
  const filters = useDeepEqualSelector(getGlobalFilters);

  const scope = useMemo(
    () => captureScope({ cards, timeRange, entityFilters, focusTileId, query, filters }),
    [cards, timeRange, entityFilters, focusTileId, query, filters]
  );
  const { openAgentBuilderFlyout } = useAgentBuilderAttachment({
    attachmentType: ENTITY_ANALYTICS_AI_BRIEF_ATTACHMENT_TYPE,
    attachmentData: scope,
    attachmentDescription: i18n.translate(
      'xpack.securitySolution.entityAnalytics.home.aiBrief.attachmentDescription',
      { defaultMessage: 'Entity Analytics view (last {timeRange})', values: { timeRange } }
    ),
    attachmentPrompt: 'Generate the Entity Analytics brief for the attached view.',
    autoSendInitialMessage: true,
  });

  // Waits for the deltas too, so the brief never reads a delta that is still loading as missing.
  const isLoading = cards.some((card) => card.isLoading || card.isDeltaLoading);
  const hasPageQuery = Boolean(scope.query || scope.filters);
  return useMemo(
    () =>
      isAgentBuilderEnabled
        ? {
            id: 'generateAiBrief',
            label: BUTTON_LABEL,
            iconType: 'sparkles',
            run: openAgentBuilderFlyout,
            disableButton: isLoading,
            tooltipContent: hasPageQuery ? SCOPE_TOOLTIP : undefined,
            testId: 'generateAiBriefButton',
          }
        : undefined,
    [hasPageQuery, isAgentBuilderEnabled, isLoading, openAgentBuilderFlyout]
  );
};

/** The view as the brief's scope: the tiles as shown, and only the filters that apply. */
const captureScope = ({
  cards,
  timeRange,
  entityFilters,
  focusTileId,
  query,
  filters,
}: {
  cards: SignalCardData[];
  timeRange: TimeRange;
  entityFilters: EntityFilters;
  focusTileId?: SignalCardId;
  query: Query;
  filters: Filter[];
}): EntityAnalyticsScope => {
  const activeEntityFilters = Object.fromEntries(
    Object.entries(entityFilters).filter(([, values]) => values.length > 0)
  );
  const activeFilters = filters.filter(({ meta }) => !meta.disabled);
  return {
    period: timeRange,
    // Recomputed whenever the tiles change, so this is when the captured values last changed.
    capturedAt: new Date().toISOString(),
    query: getSearch(query),
    filters: activeFilters.length > 0 ? activeFilters : undefined,
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

/** The search bar's query, when it has text in a language the server can build. */
const getSearch = ({ query, language }: Query): EntityAnalyticsScope['query'] => {
  const text = typeof query === 'string' ? query.trim() : '';
  if (!text || (language !== 'kuery' && language !== 'lucene')) {
    return undefined;
  }
  return { query: text, language };
};
