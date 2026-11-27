/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { convertRulesFilterToKQL } from '../../../../common/detection_engine/rule_management/rule_filtering';
import { useMitreConfiguration } from '../../../common/hooks/mitre/use_mitre_configuration';
import { useFetchRuleManagementFiltersQuery } from '../../rule_management/api/hooks/use_fetch_rule_management_filters_query';
import type { FilterOptions } from '../../rule_management/logic/types';
import { useIntegrationTitles } from '../components/group_by_fields';
import type { FacetField, FacetValue } from '../facets/facet_fields';
import { RULE_FIELD_FACETS, STATE_FACETS, tagFieldOf } from '../facets/facet_fields';
import { TAGS } from '../facets/translations';
import { useFacetCounts } from '../facets/use_facet_counts';
import { ruleQueryParams } from '../table_query';

export const TAGS_FIELD_ID = 'tags';

export const SEARCH_FIELDS = [
  ...STATE_FACETS,
  ...RULE_FIELD_FACETS,
  { id: TAGS_FIELD_ID, label: TAGS },
];

const NON_SCOPED_COUNTS = { counts: {}, tagCategoryCounts: {} };
const EMPTY_VALUES: string[] = [];
const EMPTY_TECHNIQUE_TITLES = new Map<string, string>();
const INLINE_FIELDS = new Set(['enabled', 'severity', 'lastResponse', 'source']);

export const fieldHasInlineValues = (id: string) => INLINE_FIELDS.has(id);

export interface SearchFacetValue extends Pick<FacetValue, 'value' | 'label'> {
  field: FacetField;
}

/** Uses existing filter metadata so names and IDs are available before an AI search runs. */
export const useFilterSearchOptions = (
  filterOptions: FilterOptions,
  fieldId: string | undefined
) => {
  const { data: metadata, isLoading: loadingTags } = useFetchRuleManagementFiltersQuery();
  const {
    tactics,
    techniques,
    subtechniques,
    isLoading: loadingMitre,
  } = useMitreConfiguration({
    types: ['tactic', 'technique', 'subtechnique'],
  });
  const integrationTitles = useIntegrationTitles();
  const scope = { ...filterOptions, filter: '', members: undefined };
  const { data: counts, isLoading: loadingCounts } = useFacetCounts({
    conditions: scope.conditions ?? {},
    params: ruleQueryParams(scope),
    filter: convertRulesFilterToKQL(scope) || undefined,
    enabled: fieldId === 'integration' || fieldId === 'type',
  });

  const tags = metadata?.aggregated_fields.tags ?? EMPTY_VALUES;
  const values = useMemo(() => {
    const result = new Map<string, SearchFacetValue[]>();
    for (const field of [...STATE_FACETS, ...RULE_FIELD_FACETS]) {
      let options: Array<Pick<FacetValue, 'value' | 'label'>>;
      if (field.id === 'tactic') {
        options = tactics.map(({ id, name }) => ({ value: name, label: `${name} · ${id}` }));
      } else if (field.id === 'technique') {
        options = [...techniques, ...subtechniques].map(({ id, name }) => ({
          value: id,
          label: `${id} · ${name}`,
        }));
      } else {
        options = field.values(counts ?? NON_SCOPED_COUNTS, {
          integrationTitles,
          techniqueTitles: EMPTY_TECHNIQUE_TITLES,
        });
      }
      result.set(
        field.id,
        options.map((option) => ({ ...option, field }))
      );
    }
    result.set(
      TAGS_FIELD_ID,
      tags.map((tag) => ({ value: tag, label: tag, field: tagFieldOf(tag) }))
    );
    return result;
  }, [counts, integrationTitles, subtechniques, tactics, tags, techniques]);

  const isLoading =
    (fieldId === TAGS_FIELD_ID && loadingTags) ||
    ((fieldId === 'tactic' || fieldId === 'technique') && loadingMitre) ||
    ((fieldId === 'integration' || fieldId === 'type') && loadingCounts);

  return { values, isLoading };
};
