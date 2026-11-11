/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encodeFlyoutV2UrlParam } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';

export interface ResolveFlyoutParamsConfig {
  index: string;
  alertId: string;
}

/**
 * Resolves the flyoutV2 URL parameter for the new flyout system.
 * If the URL already carries a flyoutV2 param (e.g. from a prior share link), preserves it.
 * Otherwise encodes a document descriptor for the given alert.
 */
export const resolveFlyoutV2Params = (
  { index, alertId }: ResolveFlyoutParamsConfig,
  currentParamsString: string | null
): string => {
  if (currentParamsString) {
    return currentParamsString;
  }
  return encodeFlyoutV2UrlParam([{ kind: 'document', documentId: alertId, indexName: index }]);
};
