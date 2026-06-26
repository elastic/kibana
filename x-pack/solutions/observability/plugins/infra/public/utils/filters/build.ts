/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildPhraseFilter,
  buildPhrasesFilter,
  type Filter,
  isCombinedFilter,
} from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import type { InfraCustomDashboardAssetType } from '../../../common/custom_dashboards';

// Emits a single `terms` clause (one `TermInSetQuery`) instead of an OR of
// `match_phrase` filters, which is materially faster at scale (up to 500 host
// names). `buildPhrasesFilter` supplies the `meta` so the filter bar still
// renders the "field is one of [...]" pill.
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
