/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INTRODUCTION = i18n.translate('xpack.nightshift.recommendedSources.introduction', {
  defaultMessage:
    'We will look into each source, extract the knowledge pieces we are able to find, and watch for potential problems. You can also create your own source and change this anytime later.',
});

export const SOURCES_INTRODUCTION = i18n.translate(
  'xpack.nightshift.recommendedSources.sourcesIntroduction',
  {
    defaultMessage:
      'Select recommended sources to add to this space. You can edit a recommendation or create your own draft before adding them.',
  }
);

export const RECOMMENDED_SOURCES_TITLE = i18n.translate(
  'xpack.nightshift.recommendedSources.title',
  { defaultMessage: 'Recommended sources' }
);

export const TITLE_COLUMN_HEADER = i18n.translate(
  'xpack.nightshift.recommendedSources.titleColumnHeader',
  { defaultMessage: 'Title' }
);

export const QUERY_COLUMN_HEADER = i18n.translate(
  'xpack.nightshift.recommendedSources.queryColumnHeader',
  { defaultMessage: 'Query' }
);

export const TABLE_CAPTION = i18n.translate('xpack.nightshift.recommendedSources.tableCaption', {
  defaultMessage: 'Sources to enable for detection',
});

export const SOURCES_TABLE_CAPTION = i18n.translate(
  'xpack.nightshift.recommendedSources.sourcesTableCaption',
  { defaultMessage: 'Recommended sources to add' }
);

export const CREATE_SOURCE_LABEL = i18n.translate(
  'xpack.nightshift.recommendedSources.createSourceLabel',
  { defaultMessage: 'Create new source' }
);

export const ENABLE_DETECTION_LABEL = i18n.translate(
  'xpack.nightshift.recommendedSources.enableDetectionLabel',
  { defaultMessage: 'Enable detection' }
);

export const ADD_SELECTED_SOURCES_LABEL = i18n.translate(
  'xpack.nightshift.recommendedSources.addSelectedSourcesLabel',
  { defaultMessage: 'Add selected sources' }
);

export const LOAD_ERROR_TITLE = i18n.translate(
  'xpack.nightshift.recommendedSources.loadErrorTitle',
  { defaultMessage: 'Could not load recommended sources' }
);

export const LOAD_ERROR_BODY = i18n.translate('xpack.nightshift.recommendedSources.loadErrorBody', {
  defaultMessage: 'Try again, or create a source of your own.',
});

export const RETRY_LABEL = i18n.translate('xpack.nightshift.recommendedSources.retryLabel', {
  defaultMessage: 'Try again',
});

export const EMPTY_RECOMMENDATIONS_HINT = i18n.translate(
  'xpack.nightshift.recommendedSources.emptyRecommendationsHint',
  { defaultMessage: 'Create a source to enable detection.' }
);

export const EMPTY_SOURCES_RECOMMENDATIONS_HINT = i18n.translate(
  'xpack.nightshift.recommendedSources.emptySourcesRecommendationsHint',
  { defaultMessage: 'Create a source to add it to this space.' }
);
