/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AVAILABLE_INTEGRATIONS = [
  'crowdstrike',
  'google_secops', // labelled edr/xdr
  'microsoft_sentinel', // labelled edr/xdr
  'sentinel_one',
  'splunk', // in PR
];

export const RETURN_APP_ID = 'returnAppId';
export const RETURN_PATH = 'returnPath';

export const FACETS_MAX_WIDTH_PX = 216;
export const INTEGRATIONS_GRID_MAX_WIDTH_PX = 1200;
