/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SourceError, UnsupportedMetric } from '@kbn/entity-inventory-plugin/common';

export const SOURCE_ERRORS_TITLE = i18n.translate(
  'xpack.entityInventoryApp.entityTable.sourceErrors.title',
  { defaultMessage: 'Some data sources failed' }
);

export const UNSUPPORTED_METRICS_TITLE = i18n.translate(
  'xpack.entityInventoryApp.entityTable.unsupportedMetrics.title',
  { defaultMessage: 'Some metrics could not be computed' }
);

export const LIST_WARNINGS_TITLE = i18n.translate(
  'xpack.entityInventoryApp.entityTable.listWarnings.title',
  { defaultMessage: 'Some data sources had issues' }
);

/** Tip title for the section-header warning icon (source errors and/or unsupported metrics). */
export const getListWarningsTitle = ({
  hasErrors,
  hasUnsupportedMetrics,
}: {
  hasErrors: boolean;
  hasUnsupportedMetrics: boolean;
}): string => {
  if (hasErrors && hasUnsupportedMetrics) {
    return LIST_WARNINGS_TITLE;
  }
  if (hasUnsupportedMetrics) {
    return UNSUPPORTED_METRICS_TITLE;
  }
  return SOURCE_ERRORS_TITLE;
};

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

/** One line for a metric omitted because the plan engine cannot compute its aggregation. */
export const getUnsupportedMetricText = ({
  column,
  agg,
  engine,
  indexPattern,
}: UnsupportedMetric) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.diagnostics.unsupportedMetric', {
    defaultMessage: '{column} ({agg}) omitted under {engine} on {indexPattern}',
    values: { column, agg, engine, indexPattern },
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
