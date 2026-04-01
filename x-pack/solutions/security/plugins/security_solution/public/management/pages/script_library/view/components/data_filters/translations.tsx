/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FILTER_NAMES = Object.freeze({
  platform: i18n.translate('xpack.securitySolution.scriptLibrary.filter.platform', {
    defaultMessage: 'Operating systems',
  }),
  fileType: i18n.translate('xpack.securitySolution.scriptLibrary.filter.fileType', {
    defaultMessage: 'File type',
  }),
  tags: i18n.translate('xpack.securitySolution.scriptLibrary.filter.tags', {
    defaultMessage: 'Categories',
  }),
  searchTerms: i18n.translate('xpack.securitySolution.scriptLibrary.filter.searchTerm', {
    defaultMessage: 'Search by script name, updated by or file SHA256 hash',
  }),
});

export const FILTER_PLACEHOLDERS = Object.freeze({
  getFilterOptionsLabel: (optionsCount: number) =>
    i18n.translate('xpack.securitySolution.scriptLibrary.filter.filterOptionsLabel', {
      defaultMessage: '{optionsCount} options',
      values: { optionsCount },
    }),
  listLengthTitle: (length: number) =>
    i18n.translate('xpack.securitySolution.scriptLibrary.filter.listLength', {
      defaultMessage: '{length} options',
      values: { length },
    }),
  fileType: {
    archive: i18n.translate('xpack.securitySolution.scriptLibrary.filter.fileType.archiveLabel', {
      defaultMessage: 'Archive',
    }),
    script: i18n.translate('xpack.securitySolution.scriptLibrary.filter.fileType.scriptLabel', {
      defaultMessage: 'Script',
    }),
  },
  tags: {
    searchPlaceholder: i18n.translate(
      'xpack.securitySolution.scriptLibrary.filter.tags.searchPlaceholder',
      {
        defaultMessage: 'Search categories',
      }
    ),
  },
});
