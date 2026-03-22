/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IdentityFields } from '../utils';
import type { UseHighlightedFieldsResult } from '../../../../flyout_v2/document/hooks/use_highlighted_fields';
import type { HighlightedFieldsTableRow } from '../../right/components/highlighted_fields';
import {
  HOST_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
} from '../../../../timelines/components/timeline/body/renderers/constants';

const filterEntityIdentifiersByPrefix = (
  identifiers: IdentityFields,
  prefix: 'host.' | 'user.'
): IdentityFields =>
  Object.fromEntries(Object.entries(identifiers).filter(([key]) => key.startsWith(prefix)));

export interface ConvertHighlightedFieldsToTableRowOptions {
  /**
   * Entity identifiers from the alert/document (`DataTableRecord.flattened`), not the highlighted-fields UI map.
   * Built with `euid.getEntityIdentifiersFromDocument` in the parent (same shape Elasticsearch flattening uses).
   */
  hostDocumentIdentityFields?: IdentityFields | null;
  userDocumentIdentityFields?: IdentityFields | null;
}

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
  ancestorsIndexName?: string,
  options?: ConvertHighlightedFieldsToTableRowOptions
): HighlightedFieldsTableRow[] => {
  const { hostDocumentIdentityFields = null, userDocumentIdentityFields = null } = options ?? {};
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
        ? hostDocumentIdentityFields
        : fieldName === USER_NAME_FIELD_NAME
        ? userDocumentIdentityFields
        : null;

    const identityFields =
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
        ...(identityFields ? { identityFields } : {}),
      },
    };
  });
};
