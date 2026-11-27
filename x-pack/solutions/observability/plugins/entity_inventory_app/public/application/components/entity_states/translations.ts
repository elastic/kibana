/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

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
    defaultMessage: 'Some data sources failed, so entities may exist that are not shown.',
  }
);
