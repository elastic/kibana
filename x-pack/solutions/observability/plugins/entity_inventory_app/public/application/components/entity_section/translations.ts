/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SourceError } from '@kbn/entity-inventory-plugin/common';

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
