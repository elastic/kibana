/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';

/**
 * Where the platform's public ingest endpoint for an `.inboundWebhook` connector lives. Requests
 * authenticate with `Authorization: Bearer <token>`. Built from the page origin, because that is the
 * address the person looking at it reached Kibana on.
 */
export const getInboundWebhookUrl = (http: HttpSetup, connectorId: string): string =>
  `${window.location.origin}${http.basePath.prepend(
    `/api/actions/events/.inboundWebhook/${encodeURIComponent(connectorId)}`
  )}`;
