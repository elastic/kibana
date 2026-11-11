/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  InventoryListColumn,
  InventoryOutputColumnKind,
  InventorySourceError,
  InventoryUnavailableColumn,
} from '../../../inventory_api/types';

export const getTableAriaLabel = (typeName: string) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.ariaLabel', {
    defaultMessage: '{typeName} entities',
    values: { typeName },
  });

const COLUMN_LABEL_BY_KIND: Readonly<Partial<Record<InventoryOutputColumnKind, string>>> = {
  id: i18n.translate('xpack.entityInventoryApp.entityTable.columns.entityId', {
    defaultMessage: 'Entity ID',
  }),
  last_seen: i18n.translate('xpack.entityInventoryApp.entityTable.columns.lastSeen', {
    defaultMessage: 'Last seen',
  }),
};

/** The header of a column: "Entity ID" for kind `id`, "Last seen" for `last_seen`, else its name. */
export const getColumnLabel = ({ name, kind }: InventoryListColumn): string =>
  COLUMN_LABEL_BY_KIND[kind] ?? name;

export const NO_VALUE_LABEL = i18n.translate('xpack.entityInventoryApp.entityTable.noValue', {
  defaultMessage: 'No value',
});

export const RESET_TO_DEFAULT_LABEL = i18n.translate(
  'xpack.entityInventoryApp.entityTable.resetToDefault',
  { defaultMessage: 'Reset to default' }
);

export const getTruncationTitle = ({ returned }: { returned: number }) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.truncation.moreMatchTitle', {
    defaultMessage: 'Showing the {returned, number} most recently seen entities; more match.',
    values: { returned },
  });

export const TRUNCATION_BODY = i18n.translate(
  'xpack.entityInventoryApp.entityTable.truncation.narrowTimeRangeBody',
  {
    defaultMessage:
      'Only the returned entities are listed, and sorting covers only them. Narrow the time range to see the rest.',
  }
);

export const DIAGNOSTICS_TITLE = i18n.translate(
  'xpack.entityInventoryApp.entityTable.diagnostics.title',
  { defaultMessage: 'Some data sources returned incomplete results' }
);

export const getSourceErrorText = ({ indexPattern, status, reason }: InventorySourceError) =>
  status === null
    ? i18n.translate('xpack.entityInventoryApp.entityTable.diagnostics.sourceError', {
        defaultMessage: '{indexPattern}: {reason}',
        values: { indexPattern, reason },
      })
    : i18n.translate('xpack.entityInventoryApp.entityTable.diagnostics.sourceErrorWithStatus', {
        defaultMessage: '{indexPattern} ({status}): {reason}',
        values: { indexPattern, status, reason },
      });

export const getUnavailableColumnText = ({
  column,
  indexPattern,
}: Pick<InventoryUnavailableColumn, 'column' | 'indexPattern'>) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.diagnostics.unavailableColumn', {
    defaultMessage: '{column} is not available in {indexPattern}',
    values: { column, indexPattern },
  });

export const LOADING_ENTITIES_LABEL = i18n.translate(
  'xpack.entityInventoryApp.entityTable.loading',
  { defaultMessage: 'Loading entities' }
);

export const LOAD_ERROR_TITLE = i18n.translate(
  'xpack.entityInventoryApp.entityTable.loadError.title',
  { defaultMessage: 'Unable to load entities' }
);

export const RETRY_LABEL = i18n.translate('xpack.entityInventoryApp.entityTable.loadError.retry', {
  defaultMessage: 'Try again',
});

export const getTypeNotAvailableTitle = (entityType: string) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.typeNotAvailable.title', {
    defaultMessage: '{entityType} entities are not available',
    values: { entityType },
  });

export const getEmptyTitle = (typeName: string) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.empty.title', {
    defaultMessage: 'No {typeName} entities found',
    values: { typeName },
  });

export const EMPTY_BODY = i18n.translate('xpack.entityInventoryApp.entityTable.empty.body', {
  defaultMessage: 'Try a different time range.',
});

export const getEmptyWithFailuresTitle = (typeName: string) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.empty.withFailures.title', {
    defaultMessage: 'No {typeName} entities were returned',
    values: { typeName },
  });

export const EMPTY_WITH_FAILURES_BODY = i18n.translate(
  'xpack.entityInventoryApp.entityTable.empty.withFailures.sourcesFailedBody',
  {
    defaultMessage:
      'Some data sources failed, so entities may exist that are not shown. See the details above.',
  }
);
