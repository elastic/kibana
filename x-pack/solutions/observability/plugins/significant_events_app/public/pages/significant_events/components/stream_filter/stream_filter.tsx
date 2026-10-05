/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import React, { useMemo } from 'react';
import { KnowledgeIndicatorSelectableFilter } from '../../../../components/knowledge_indicators/knowledge_indicator_selectable_filter';
import { getKnowledgeIndicatorSourceId } from '../../../../components/knowledge_indicators/utils/get_knowledge_indicator_source_id';
import { useSourcesById } from '../../../../hooks/use_sources_by_id';

interface StreamFilterProps {
  knowledgeIndicators: KnowledgeIndicator[];
  searchTerm: string;
  statusFilter: 'active' | 'excluded';
  selectedTypes: string[];
  hideComputedTypes: boolean;
  selectedStreams: string[];
  onSelectedStreamsChange: (selectedStreams: string[]) => void;
}

export function StreamFilter({
  knowledgeIndicators,
  searchTerm,
  statusFilter,
  selectedTypes,
  hideComputedTypes,
  selectedStreams,
  onSelectedStreamsChange,
}: StreamFilterProps) {
  const { getSourceTitle } = useSourcesById();
  const filterCriteria = useMemo(
    () => ({ statusFilter, selectedTypes, hideComputedTypes }),
    [statusFilter, selectedTypes, hideComputedTypes]
  );

  return (
    <KnowledgeIndicatorSelectableFilter
      knowledgeIndicators={knowledgeIndicators}
      searchTerm={searchTerm}
      getValue={getKnowledgeIndicatorSourceId}
      getLabel={getSourceTitle}
      selected={selectedStreams}
      onSelectedChange={onSelectedStreamsChange}
      labels={{
        button: i18n.translate(
          'xpack.significantEventsApp.sources.knowledgeIndicators.filterLabel',
          {
            defaultMessage: 'Source',
          }
        ),
        groupLabel: i18n.translate(
          'xpack.significantEventsApp.sources.knowledgeIndicators.filterGroupLabel',
          {
            defaultMessage: 'Filter by source',
          }
        ),
        popoverAriaLabel: i18n.translate(
          'xpack.significantEventsApp.sources.knowledgeIndicators.filterPopoverLabel',
          { defaultMessage: 'Source filter' }
        ),
        selectableAriaLabel: i18n.translate(
          'xpack.significantEventsApp.sources.knowledgeIndicators.filterSelectableAriaLabel',
          { defaultMessage: 'Filter knowledge indicators by source' }
        ),
      }}
      filterCriteria={filterCriteria}
    />
  );
}
