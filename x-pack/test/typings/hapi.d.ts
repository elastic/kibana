/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CloudPlugin } from 'x-pack/plugins/cloud';
import { IndexPatternsServiceFactory } from 'src/legacy/server/index_patterns';
import { KibanaConfig, SavedObjectsService } from 'src/legacy/server/kbn_server';
import { SecurityPlugin } from 'x-pack/plugins/security/security';
import { XPackMainPlugin } from 'x-pack/plugins/xpack_main/xpack_main';

declare module 'hapi' {
  interface Server {
    config: () => KibanaConfig;
    indexPatternsServiceFactory: IndexPatternsServiceFactory;
    savedObjects: SavedObjectsService;
  }
  interface PluginProperties {
    cloud: CloudPlugin;
    security: SecurityPlugin;
    xpack_main: XPackMainPlugin;
  }
}
