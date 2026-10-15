/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';
import { ELASTIC_INTERNAL_ORIGIN_HEADER, PUBLIC_API_HEADERS } from '@kbn/scout-security';

export const PUBLIC_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'Content-Type': 'application/json;charset=UTF-8',
  ...ELASTIC_INTERNAL_ORIGIN_HEADER,
  ...PUBLIC_API_HEADERS,
};

/**
 * No Security Solution privileges (Security `read` still carries the deprecated alert update
 * privilege): the alert update routes reject it during route authorization.
 */
export const NO_SECURITY_PRIVILEGES_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { discover: ['all'] }, spaces: ['*'] }],
};

/**
 * Full Kibana privileges without any Elasticsearch index privileges: the alert update routes
 * authorize the request, then the handler gets a 403 from Elasticsearch.
 */
export const KIBANA_ALL_NO_INDEX_PRIVILEGES_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};

export const AUTHORIZATION_FAILURE_AUDIT_MESSAGE =
  'Failed attempt to update alerts because required privileges were not granted';
