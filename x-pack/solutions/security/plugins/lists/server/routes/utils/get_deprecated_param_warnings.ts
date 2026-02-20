/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import type {
  CreateListRequestBody,
  ImportListItemsRequestQuery,
} from '@kbn/securitysolution-lists-common/api';

// type requestSerializerTypes = { body: typeof CreateListRequestBody} | {query: typeof ImportListItemsRequestQuery}

/**
 * Creates HTTP Warning headers for deprecated query parameters.
 * Follows RFC 7234 format: 299 Kibana-{version} "{message}"
 * @param request The Kibana request object
 * @param kibanaVersion The Kibana version string
 * @returns An object with warning headers if deprecated params are found, or undefined
 */
export const getDeprecatedParamWarnings = (
  request: KibanaRequest<
    unknown,
    ImportListItemsRequestQuery | unknown,
    CreateListRequestBody | unknown
  >,
  kibanaVersion: string
): { warning?: string } | undefined => {
  const warnings: string[] = [];

  // Check for serializer parameter in query string
  if (
    request.url.searchParams.has('serializer') ||
    !isEmpty((request.body as Record<string, unknown>)?.serializer)
  ) {
    warnings.push(
      'The "serializer" query parameter is not supported and will be ignored. Custom serializers have been removed.'
    );
  }

  // Check for deserializer parameter in query string
  if (
    request.url.searchParams.has('deserializer') ||
    !isEmpty((request.body as Record<string, unknown>)?.deserializer)
  ) {
    warnings.push(
      'The "deserializer" query parameter is not supported and will be ignored. Custom deserializers have been removed.'
    );
  }

  if (warnings.length === 0) {
    return undefined;
  }

  // Format warning header according to RFC 7234
  // Multiple warnings can be combined with comma separation
  const warningHeader = warnings.map((msg) => `299 Kibana-${kibanaVersion} "${msg}"`).join(', ');

  return { warning: warningHeader };
};
