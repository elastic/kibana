/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* PoC (do not merge): "Generate AI brief" entry point. Not production code. */

import React, { useMemo } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../common/store/inputs';
import type { SignalCardData, SignalCardId } from '../needs_attention_tiles/data';
import type { EntityFilters } from '../use_entity_filters_param';
import type { TimeRange } from '../use_time_range_param';

/** Matches the scope attachment's per-tile limit on the server. */
const MAX_ENTITY_IDS_PER_TILE = 20;

interface GenerateAiBriefButtonProps {
  cards: SignalCardData[];
  entityIdsByTile: Record<SignalCardId, readonly string[]>;
  timeRange: TimeRange;
  entityFilters: EntityFilters;
  focusTileId?: SignalCardId;
}

/** Captures the page's own tiles, period and filters, and opens Agent Builder to brief on them. */
export const GenerateAiBriefButton: React.FC<GenerateAiBriefButtonProps> = ({
  cards,
  entityIdsByTile,
  timeRange,
  entityFilters,
  focusTileId,
}) => {
  const getGlobalQuery = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const getGlobalFilters = useMemo(() => inputsSelectors.globalFiltersQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuery);
  const globalFilters = useDeepEqualSelector(getGlobalFilters);

  const isLoading = cards.some(
    ({ isLoading: loading, isDeltaLoading }) => loading || isDeltaLoading
  );

  const scope = useMemo(() => {
    const activeEntityFilters = Object.fromEntries(
      Object.entries(entityFilters).filter(([, values]) => values.length > 0)
    );
    const filters = globalFilters.filter(({ meta }) => !meta.disabled);
    const queryText = typeof query.query === 'string' ? query.query.trim() : '';
    return {
      period: timeRange,
      // Recomputed whenever the tiles change, so this is when the captured values last changed.
      capturedAt: new Date().toISOString(),
      query:
        queryText && (query.language === 'kuery' || query.language === 'lucene')
          ? { query: queryText, language: query.language }
          : undefined,
      filters: filters.length > 0 ? filters : undefined,
      entityFilters: Object.keys(activeEntityFilters).length > 0 ? activeEntityFilters : undefined,
      focusTileId,
      tiles: Object.fromEntries(
        cards.map(({ id, value, delta, noDataMessage }) => [
          id,
          {
            value,
            delta,
            unavailable: noDataMessage ? true : undefined,
            entityIds: entityIdsByTile[id].slice(0, MAX_ENTITY_IDS_PER_TILE),
          },
        ])
      ),
    };
  }, [cards, entityFilters, entityIdsByTile, focusTileId, globalFilters, query, timeRange]);

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment({
    attachmentType: SecurityAgentBuilderAttachments.entityAnalyticsScope,
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

  return (
    <EuiButton
      iconType="sparkles"
      size="s"
      isDisabled={isLoading}
      onClick={openAgentBuilderFlyout}
      data-test-subj="generateAiBriefButton"
    >
      {i18n.translate('xpack.securitySolution.entityAnalytics.home.aiBrief.buttonLabel', {
        defaultMessage: 'Generate AI brief',
      })}
    </EuiButton>
  );
};
