/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';

import { INDICES_APP_ID } from '../../common';
import { CREATE_INDEX_PATH } from '../routes';

export interface CreateIndexLocatorParams extends SerializableRecord {
  workflow?: string;
}
export class CreateIndexLocatorDefinition implements LocatorDefinition<SerializableRecord> {
  public readonly getLocation = async (params: CreateIndexLocatorParams) => {
    const path = `${CREATE_INDEX_PATH}${params.workflow ? `?workflow=${params.workflow}` : ''}`;

    return {
      app: INDICES_APP_ID,
      path,
      state: {},
    };
  };

  public readonly id = 'SEARCH_CREATE_INDEX';
}
