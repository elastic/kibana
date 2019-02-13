/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'hapi';

import { CloudPlugin } from 'x-pack/plugins/cloud';
import { XPackMainPlugin } from 'x-pack/plugins/xpack_main/xpack_main';

declare module 'hapi' {
  interface PluginProperties {
    cloud: CloudPlugin;
    xpack_main: XPackMainPlugin;
  }
}
