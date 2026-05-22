/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildPhraseFilter,
  buildPhrasesFilter,
  buildCombinedFilter,
  BooleanRelation,
  type Filter,
  isCombinedFilter,
} from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import type { InfraCustomDashboardAssetType } from '../../../common/custom_dashboards';
import { pocFlags } from '../../pages/metrics/hosts/hooks/use_poc_settings';

// P1 — flat `terms` filter instead of an `OR`-of-`match_phrase`.
/**
 * Build a filter that matches when `field` is one of `values`.
 *
 * The semantic is `field IN values`. We emit a single `terms` clause rather
 * than an `OR` of `match_phrase` filters: at scale (e.g. the Hosts UI with
 * up to 500 host names) the `bool.should` shape forces Elasticsearch to
 * rewrite into a disjunction of N `TermQuery` instances, while a `terms`
 * clause becomes a single `TermInSetQuery` and runs materially faster on
 * keyword fields.
 *
 * The `meta` is built via `buildPhrasesFilter` so the filter bar renders
 * the familiar "field is one of [...]" pill with full value list.
 *
 * **PoC gear toggle**: when `pocFlags.useUniversalFixes === false`, this
 * helper falls back to the pre-P1 `OR`-of-`match_phrase` shape so the
 * Hosts page can be benchmarked against the original filter cost.
 */
export const buildCombinedAssetFilter = ({
  field,
  values,
  dataView,
}: {
  values: string[];
  field: string;
  dataView?: DataView;
}) => {
  const indexField = dataView?.getFieldByName(field);

  if (!pocFlags.useUniversalFixes && dataView && indexField) {
    const filtersFromValues = values.map((value) => buildPhraseFilter(indexField, value, dataView));
    return buildCombinedFilter(BooleanRelation.OR, filtersFromValues, dataView);
  }

  const termsQuery = { terms: { [field]: values } };

  if (!dataView || !indexField) {
    return {
      query: termsQuery,
      meta: {},
    };
  }

  return {
    ...buildPhrasesFilter(indexField, values, dataView),
    query: termsQuery,
  };
};

export const retrieveFieldsFromFilter = (filters: Filter[], fields: string[] = []) => {
  for (const filter of filters) {
    if (isCombinedFilter(filter)) {
      retrieveFieldsFromFilter(filter.meta.params, fields);
    }

    if (filter.meta.key) {
      fields.push(filter.meta.key);
    }
  }

  return fields;
};

export const buildAssetIdFilter = (
  assetId: string,
  assetType: InfraCustomDashboardAssetType,
  dataView: DataView
): Filter[] => {
  const assetIdField = dataView.getFieldByName(findInventoryFields(assetType).id);
  return assetIdField ? [buildPhraseFilter(assetIdField, assetId, dataView)] : [];
};
