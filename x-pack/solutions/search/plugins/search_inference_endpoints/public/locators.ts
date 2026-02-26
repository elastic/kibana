/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';

import { MANAGEMENT_APP_ID } from '../common/constants';

export function registerLocators(share: SharePluginSetup) {
  share.url.locators.create<SerializableRecord>(new SearchInferenceEndpointLocatorDefinition());
}

class SearchInferenceEndpointLocatorDefinition implements LocatorDefinition<SerializableRecord> {
  public readonly getLocation = async () => {
    return {
      app: 'management',
      path: `/ml/${MANAGEMENT_APP_ID}`,
      state: {},
    };
  };

  public readonly id = 'SEARCH_INFERENCE_ENDPOINTS';
}
