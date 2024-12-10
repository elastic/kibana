/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPhrasesFilter, buildPhraseFilter, FilterStateStore } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';

export function buildMetadataFilter({
  field,
  value,
  dataView,
  negate = false,
}: {
  value: string | Array<string | number>;
  negate: boolean;
  field: string;
  dataView: DataView | undefined;
}) {
  if (!dataView) {
    return null;
  }
  const indexField = dataView.getFieldByName(field)!;
  const areMultipleValues = Array.isArray(value) && value.length > 1;
  const filter = areMultipleValues
    ? buildPhrasesFilter(indexField, value, dataView)
    : buildPhraseFilter(indexField, Array.isArray(value) ? value[0] : value, dataView);

  filter.meta.type = areMultipleValues ? 'phrases' : 'phrase';
  filter.$state = { store: 'appState' as FilterStateStore.APP_STATE };

  filter.meta.value = Array.isArray(value)
    ? !areMultipleValues
      ? `${value[0]}`
      : undefined
    : value;

  filter.meta.key = field;
  filter.meta.alias = null;
  filter.meta.negate = negate;
  filter.meta.disabled = false;

  return filter;
}
