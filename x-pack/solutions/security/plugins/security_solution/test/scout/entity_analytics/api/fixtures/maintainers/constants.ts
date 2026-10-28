/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_INTERNAL_ORIGIN_HEADER, PUBLIC_API_HEADERS, tags } from '@kbn/scout-security';
import {
  ENTITY_LATEST,
  ENTITY_UPDATES,
  ENTITY_HISTORY,
  getEntitiesAlias,
  getLatestEntitiesIndexName,
  getEntityIndexPattern,
  ENTITY_SCHEMA_VERSION_V2,
  ENTITY_STORE_ROUTES as COMMON_ROUTES,
} from '@kbn/entity-store/common';

const BASE_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const PUBLIC_HEADERS = {
  ...BASE_HEADERS,
  ...PUBLIC_API_HEADERS,
};

export const INTERNAL_HEADERS = {
  ...BASE_HEADERS,
  ...ELASTIC_INTERNAL_ORIGIN_HEADER,
  'elastic-api-version': '2',
};

// Strip the leading '/' from common route strings — Scout's apiClient.post/get
// prepends the Kibana base URL, so paths must not start with '/'.
const r = (route: string) => route.replace(/^\//, '');

// Dynamic routes: substitute the OpenAPI {param} placeholder with a real value.
const withId = (route: string, id: string) => r(route.replace('{id}', id));

export const ENTITY_STORE_ROUTES = {
  public: {
    INSTALL: r(COMMON_ROUTES.public.INSTALL),
    STATUS: r(COMMON_ROUTES.public.STATUS),
    UNINSTALL: r(COMMON_ROUTES.public.UNINSTALL),
  },
  internal: {
    ENTITY_MAINTAINERS_INIT: r(COMMON_ROUTES.internal.ENTITY_MAINTAINERS_INIT),
    ENTITY_MAINTAINERS_RUN: (id: string) =>
      withId(COMMON_ROUTES.internal.ENTITY_MAINTAINERS_RUN, id),
  },
};

export const ENTITY_STORE_TAGS = [...tags.stateful.classic, ...tags.serverless.security.complete];

export const UPDATES_INDEX = getEntityIndexPattern({
  schemaVersion: ENTITY_SCHEMA_VERSION_V2,
  dataset: ENTITY_UPDATES,
  namespace: 'default',
});
export const LATEST_ALIAS = getEntitiesAlias(ENTITY_LATEST, 'default');
export const LATEST_INDEX = getLatestEntitiesIndexName('default');
export const HISTORY_INDEX_PATTERN = `${getEntityIndexPattern({
  schemaVersion: ENTITY_SCHEMA_VERSION_V2,
  dataset: ENTITY_HISTORY,
  namespace: 'default',
})}*`;
