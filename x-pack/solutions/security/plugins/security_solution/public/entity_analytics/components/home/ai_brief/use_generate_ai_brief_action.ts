/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderMenu } from '@kbn/app-header';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import {
  ENTITY_ANALYTICS_SCOPE_ATTACHMENT_TYPE,
  MAX_ENTITY_IDS_PER_TILE,
} from '../../../../../common/entity_analytics/ai_brief/scope';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../common/store/inputs';
import type { SignalCardData, SignalCardId } from '../needs_attention_tiles/data';
import type { EntityFilters } from '../use_entity_filters_param';
import type { TimeRange } from '../use_time_range_param';

interface UseGenerateAiBriefActionParams {
  cards: SignalCardData[];
  entityIdsByTile: Record<SignalCardId, readonly string[]>;
  /** Tiles whose value is not real: the query failed or has no data source. */
  unavailableTiles: Record<SignalCardId, boolean>;
  timeRange: TimeRange;
  entityFilters: EntityFilters;
  focusTileId?: SignalCardId;
}

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
 * The page header's "Generate AI brief" action: captures the page's own tiles, period and filters, and
 * opens Agent Builder to brief on them.
 */
export const useGenerateAiBriefAction = ({
  cards,
  entityIdsByTile,
  unavailableTiles,
  timeRange,
  entityFilters,
  focusTileId,
}: UseGenerateAiBriefActionParams): NonNullable<AppHeaderMenu['primaryActionItem']> => {
  const getGlobalQuery = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const getGlobalFilters = useMemo(() => inputsSelectors.globalFiltersQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuery);
  const globalFilters = useDeepEqualSelector(getGlobalFilters);

  // Waits for the deltas too, so the brief never reads a delta that is still loading as missing.
  const isLoading = cards.some(
    ({ isLoading: isCardLoading, isDeltaLoading }) => isCardLoading || isDeltaLoading
  );

  const scope = useMemo((): EntityAnalyticsScope => {
    const activeEntityFilters = Object.fromEntries(
      Object.entries(entityFilters).filter(([, values]) => values.length > 0)
    );
    const filters = globalFilters.filter(({ meta }) => !meta.disabled);
    const queryText = typeof query.query === 'string' ? query.query.trim() : '';
    const { language } = query;
    const isSupportedLanguage = language === 'kuery' || language === 'lucene';
    return {
      period: timeRange,
      // Recomputed whenever the tiles change, so this is when the captured values last changed.
      capturedAt: new Date().toISOString(),
      query: queryText && isSupportedLanguage ? { query: queryText, language } : undefined,
      filters: filters.length > 0 ? filters : undefined,
      entityFilters: Object.keys(activeEntityFilters).length > 0 ? activeEntityFilters : undefined,
      focusTileId,
      tiles: Object.fromEntries(
        cards.map(({ id, value, delta, noDataMessage }) => [
          id,
          {
            value,
            delta,
            unavailable: noDataMessage || unavailableTiles[id] ? true : undefined,
            entityIds: entityIdsByTile[id].slice(0, MAX_ENTITY_IDS_PER_TILE),
          },
        ])
      ),
    };
  }, [
    cards,
    entityFilters,
    entityIdsByTile,
    focusTileId,
    globalFilters,
    query,
    timeRange,
    unavailableTiles,
  ]);

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment({
    attachmentType: ENTITY_ANALYTICS_SCOPE_ATTACHMENT_TYPE,
    attachmentData: scope,
    attachmentDescription: i18n.translate(
      'xpack.securitySolution.entityAnalytics.home.aiBrief.attachmentDescription',
      {
        defaultMessage: 'Entity Analytics view (last {timeRange})',
        values: { timeRange },
      }
    ),
    attachmentPrompt: 'Generate the Entity Analytics brief for the attached view.',
    autoSendInitialMessage: true,
  });

  const hasPageQuery = Boolean(scope.query || scope.filters);
  return useMemo(
    () => ({
      id: 'generateAiBrief',
      label: BUTTON_LABEL,
      iconType: 'sparkles',
      run: openAgentBuilderFlyout,
      disableButton: isLoading,
      tooltipContent: hasPageQuery ? SCOPE_TOOLTIP : undefined,
      testId: 'generateAiBriefButton',
    }),
    [hasPageQuery, isLoading, openAgentBuilderFlyout]
  );
};
