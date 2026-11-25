/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { ENVIRONMENT_ALL_VALUE, ENVIRONMENT_NOT_DEFINED_VALUE } from '@kbn/apm-types';
import { mobileDocuments } from './documents';
import { mobileColumn } from './fields';

/** The filters every mobile panel applies, besides the time range and the environment. */
export interface MobilePanelFilters {
  serviceName: string;
  /** A resource `os.name` as the SDKs send it, e.g. `iPadOS`. */
  osName?: string;
  /** A release, as the SDKs send it in `service.version`. */
  release?: string;
}

/**
 * The documents of a mobile panel, filtered; the time range and environment are applied apart.
 * Values from the request are params, which `inlineParams` writes into the query for Discover.
 */
export const mobilePanelQuery = ({
  serviceName,
  osName,
  release,
}: MobilePanelFilters): ComposerQuery => {
  let query = mobileDocuments().pipe`WHERE ${mobileColumn('serviceName')} == ${{
    service_name: serviceName,
  }}`;
  if (osName) {
    query = query.pipe`WHERE ${mobileColumn('osName')} == ${{ os_name: osName }}`;
  }
  if (release) {
    query = query.pipe`WHERE ${mobileColumn('serviceVersion')} == ${{ release }}`;
  }
  return query;
};

/**
 * The documents in `environment`, as the routes' `environmentFilter` keeps them: either
 * environment field, or "Not defined" for APM's sentinel or neither; all for all environments.
 */
export const withEnvironment = (
  query: ComposerQuery,
  environment: string | undefined
): ComposerQuery => {
  if (!environment || environment === ENVIRONMENT_ALL_VALUE) {
    return query;
  }
  const environmentColumn = mobileColumn('environment');
  const environmentNameColumn = mobileColumn('environmentName');
  if (environment === ENVIRONMENT_NOT_DEFINED_VALUE) {
    return query.pipe`WHERE ${environmentColumn} == ${ENVIRONMENT_NOT_DEFINED_VALUE}
      OR (${environmentColumn} IS NULL AND ${environmentNameColumn} IS NULL)`;
  }
  return query.pipe`WHERE ${environmentColumn} == ${environment}
    OR ${environmentNameColumn} == ${environment}`;
};
