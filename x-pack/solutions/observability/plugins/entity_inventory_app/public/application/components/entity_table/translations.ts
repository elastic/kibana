/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const getTableAriaLabel = (typeName: string) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.ariaLabel', {
    defaultMessage: '{typeName} entities',
    values: { typeName },
  });

export const NO_VALUE_LABEL = i18n.translate('xpack.entityInventoryApp.entityTable.noValue', {
  defaultMessage: 'No value',
});

export const RESET_TO_DEFAULT_LABEL = i18n.translate(
  'xpack.entityInventoryApp.entityTable.resetToDefault',
  { defaultMessage: 'Reset to default' }
);

export const getTruncationTitle = ({ returned, total }: { returned: number; total: number }) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.truncation.title', {
    defaultMessage: 'Showing the {returned} most recently seen of {total} entities',
    values: { returned, total },
  });

export const getTruncationTotalUnknownTitle = ({ returned }: { returned: number }) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.truncation.totalUnknownTitle', {
    defaultMessage:
      'Showing the {returned} most recently seen entities. The total could not be counted.',
    values: { returned },
  });

export const TRUNCATION_BODY = i18n.translate(
  'xpack.entityInventoryApp.entityTable.truncation.body',
  {
    defaultMessage:
      'Only the returned entities are listed, and sorting covers only them. Narrow the time range or filter down to see the rest.',
  }
);

export const DIAGNOSTICS_TITLE = i18n.translate(
  'xpack.entityInventoryApp.entityTable.diagnostics.title',
  { defaultMessage: 'Some data sources returned incomplete results' }
);

export const getSourceErrorText = ({
  indexPattern,
  status,
  reason,
}: {
  indexPattern: string;
  status: number | null;
  reason: string;
}) =>
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
}: {
  column: string;
  indexPattern: string;
}) =>
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
