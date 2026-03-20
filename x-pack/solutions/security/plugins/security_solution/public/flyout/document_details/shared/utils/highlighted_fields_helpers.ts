/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseHighlightedFieldsResult } from '../../../../flyout_v2/document/hooks/use_highlighted_fields';
import type { HighlightedFieldsTableRow } from '../../right/components/highlighted_fields';

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
  const fieldNames = Object.keys(highlightedFields);
  return fieldNames.map((fieldName) => {
    const overrideFieldName = highlightedFields[fieldName].overrideField?.field;
    const overrideFieldValues = highlightedFields[fieldName].overrideField?.values;
    const field = overrideFieldName ? overrideFieldName : fieldName;
    const values = overrideFieldValues?.length
      ? overrideFieldValues
      : highlightedFields[fieldName].values;

    return {
      field,
      description: {
        field,
        ...(overrideFieldName ? { originalField: fieldName } : {}),
        values,
        scopeId,
        showCellActions,
        ancestorsIndexName,
      },
    };
  });
};
