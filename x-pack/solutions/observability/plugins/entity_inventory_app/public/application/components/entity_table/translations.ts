/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SourceError } from '@kbn/entity-inventory-plugin/common';

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

export const TRUNCATION_TITLE = i18n.translate(
  'xpack.entityInventoryApp.entityTable.truncation.limitTitle',
  { defaultMessage: 'Entity limit reached' }
);

export const TRUNCATION_BODY = i18n.translate(
  'xpack.entityInventoryApp.entityTable.truncation.limitBody',
  {
    defaultMessage:
      'We can only show a limited number of entities at a time. Use filters to slice and dice further your data. ',
  }
);

export const getTruncatedTypesText = (typeNames: readonly string[]) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.truncation.truncatedTypes', {
    defaultMessage: 'Entity types over the limit: {typeNames}',
    values: {
      typeNames: new Intl.ListFormat(i18n.getLocale(), {
        style: 'long',
        type: 'conjunction',
      }).format(typeNames),
    },
  });

export const SOURCE_ERRORS_TITLE = i18n.translate(
  'xpack.entityInventoryApp.entityTable.sourceErrors.title',
  { defaultMessage: 'Some data sources failed' }
);

export const getSourceErrorText = ({ indexPattern, status, reason }: SourceError) =>
  status === null
    ? i18n.translate('xpack.entityInventoryApp.entityTable.diagnostics.sourceError', {
        defaultMessage: '{indexPattern}: {reason}',
        values: { indexPattern, reason },
      })
    : i18n.translate('xpack.entityInventoryApp.entityTable.diagnostics.sourceErrorWithStatus', {
        defaultMessage: '{indexPattern} ({status}): {reason}',
        values: { indexPattern, status, reason },
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
    defaultMessage: 'Some data sources failed, so entities may exist that are not shown.',
  }
);

export const ENTITY_COUNT_LABEL = i18n.translate(
  'xpack.entityInventoryApp.entityTable.section.entityCountLabel',
  { defaultMessage: 'Entities:' }
);

/** The number of listed entities, "1,234"; a truncated list holds only some, so it reads "9,999+". */
export const getEntityCountValue = ({ count, truncated }: { count: number; truncated: boolean }) =>
  truncated
    ? i18n.translate('xpack.entityInventoryApp.entityTable.section.truncatedEntityCount', {
        defaultMessage: '{count, number}+',
        values: { count },
      })
    : i18n.translate('xpack.entityInventoryApp.entityTable.section.entityCount', {
        defaultMessage: '{count, number}',
        values: { count },
      });
