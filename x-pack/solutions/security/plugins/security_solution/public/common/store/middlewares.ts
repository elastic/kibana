/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

import { createTimelineMiddlewares } from '../../timelines/store/middlewares/create_timeline_middlewares';
import { dataTableLocalStorageMiddleware } from './data_table/middleware_local_storage';
import { userAssetTableLocalStorageMiddleware } from '../../explore/users/store/middleware_storage';

export function createMiddlewares(kibana: CoreStart, storage: Storage) {
  return [
    dataTableLocalStorageMiddleware(storage),
    userAssetTableLocalStorageMiddleware(storage),
    ...createTimelineMiddlewares(kibana),
  ];
}
