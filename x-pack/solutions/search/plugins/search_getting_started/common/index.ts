/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN_ID = 'searchGettingStarted';
export const PLUGIN_NAME = i18n.translate('xpack.search.gettingStarted.plugin.name', {
  defaultMessage: 'Getting started',
});
export const PLUGIN_PATH = '/app/elasticsearch/getting_started';

export enum AnalyticsEvents {
  gettingStartedLoaded = 'getting_started_loaded',
}
