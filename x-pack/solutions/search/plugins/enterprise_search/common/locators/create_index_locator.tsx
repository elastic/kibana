/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';

import { CREATE_NEW_INDEX_URL, ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../constants';

export type CreateIndexLocatorParams = SerializableRecord;

export class CreateIndexLocatorDefinition implements LocatorDefinition<CreateIndexLocatorParams> {
  public readonly getLocation = async () => {
    return {
      app: ENTERPRISE_SEARCH_CONTENT_PLUGIN.ID,
      path: CREATE_NEW_INDEX_URL,
      state: {},
    };
  };

  public readonly id = 'CREATE_INDEX_LOCATOR_ID';
}
