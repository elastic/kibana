/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';

export const getSpaceId = ({
  request,
  spaces,
}: {
  request: KibanaRequest;
  spaces: SpacesServiceStart | undefined | null;
}): string => spaces?.getSpaceId(request) ?? 'default';
