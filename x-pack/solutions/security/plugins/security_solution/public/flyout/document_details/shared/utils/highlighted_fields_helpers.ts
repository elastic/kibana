/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityIdentifiers } from '../utils';
import type { UseHighlightedFieldsResult } from '../hooks/use_highlighted_fields';
import type { HighlightedFieldsTableRow } from '../../right/components/highlighted_fields';
import { getHostEntityIdentifiers, getUserEntityIdentifiers } from '../utils';
import {
  HOST_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
} from '../../../../timelines/components/timeline/body/renderers/constants';

const filterEntityIdentifiersByPrefix = (
  identifiers: EntityIdentifiers,
  prefix: 'host.' | 'user.'
): EntityIdentifiers =>
  Object.fromEntries(Object.entries(identifiers).filter(([key]) => key.startsWith(prefix)));

/**
 * Converts the highlighted fields to a format that can be consumed by the HighlightedFields component
 * @param highlightedFields field/value pairs
 * @param scopeId used in the alerts page for CellActions
 * @param isPreview used in the alerts page for CellActions and also to hide PreviewLinks
 * @param showCellActions used in alert summary page to hide CellActions entirely
 */
export const convertHighlightedFieldsToTableRow = (
  highlightedFields: UseHighlightedFieldsResult,
  scopeId: string,
  showCellActions: boolean,
  ancestorsIndexName?: string
): HighlightedFieldsTableRow[] => {
  const getFieldsData = (field: string) => highlightedFields[field]?.values;

  const fieldNames = Object.keys(highlightedFields);
  return fieldNames.map((fieldName) => {
    const overrideFieldName = highlightedFields[fieldName].overrideField?.field;
    const overrideFieldValues = highlightedFields[fieldName].overrideField?.values;
    const field = overrideFieldName ? overrideFieldName : fieldName;
    const values = overrideFieldValues?.length
      ? overrideFieldValues
      : highlightedFields[fieldName].values;

    const rawEntityIdentifiers =
      fieldName === HOST_NAME_FIELD_NAME
        ? getHostEntityIdentifiers({} as never, getFieldsData)
        : fieldName === USER_NAME_FIELD_NAME
        ? getUserEntityIdentifiers({} as never, getFieldsData)
        : null;

    const entityIdentifiers =
      rawEntityIdentifiers && fieldName === HOST_NAME_FIELD_NAME
        ? filterEntityIdentifiersByPrefix(rawEntityIdentifiers, 'host.')
        : rawEntityIdentifiers && fieldName === USER_NAME_FIELD_NAME
        ? filterEntityIdentifiersByPrefix(rawEntityIdentifiers, 'user.')
        : null;

    return {
      field,
      description: {
        field,
        ...(overrideFieldName ? { originalField: fieldName } : {}),
        values,
        scopeId,
        showCellActions,
        ancestorsIndexName,
        ...(entityIdentifiers ? { entityIdentifiers } : {}),
      },
    };
  });
};

/**
 * Converts the highlighted fields to a format that can be consumed by the prevalence query
 * @param highlightedFields
 */
export const convertHighlightedFieldsToPrevalenceFilters = (
  highlightedFields: UseHighlightedFieldsResult
): Record<string, QueryDslQueryContainer> => {
  const fieldNames = Object.keys(highlightedFields);
  return fieldNames.reduce((acc, curr) => {
    const values = highlightedFields[curr].values;

    return {
      ...acc,
      [curr]: { terms: { [curr]: values } },
    };
  }, []) as unknown as Record<string, QueryDslQueryContainer>;
};
