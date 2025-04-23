/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const THREAT_HUNTING_PUBLIC_URL = `/api/entity_analytics/threat_hunting` as const;

export const THREAT_HUNTING_PUBLIC_LIST_URL = `${THREAT_HUNTING_PUBLIC_URL}/queries/list` as const;

export const THREAT_HUNTING_PUBLIC_GET_BY_UUID_URL = (uuid: string) =>
  `${THREAT_HUNTING_PUBLIC_URL}/queries/${uuid}` as const;
