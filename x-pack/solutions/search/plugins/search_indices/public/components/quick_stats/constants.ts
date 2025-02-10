/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DOCUMENT_COUNT_LABEL = i18n.translate(
  'xpack.searchIndices.quickStats.document_count_heading',
  {
    defaultMessage: 'Document count',
  }
);
export const TOTAL_COUNT_LABEL = i18n.translate(
  'xpack.searchIndices.quickStats.documents.totalTitle',
  {
    defaultMessage: 'Total',
  }
);
export const DELETED_COUNT_LABEL = i18n.translate(
  'xpack.searchIndices.quickStats.documents.deletedTitle',
  {
    defaultMessage: 'Deleted',
  }
);
export const INDEX_SIZE_LABEL = i18n.translate(
  'xpack.searchIndices.quickStats.documents.indexSize',
  {
    defaultMessage: 'Index Size',
  }
);
export const DOCUMENT_COUNT_TOOLTIP = i18n.translate(
  'xpack.searchIndices.quickStats.documentCountTooltip',
  {
    defaultMessage:
      'This excludes nested documents, which Elasticsearch uses internally to store chunks of vectors.',
  }
);
