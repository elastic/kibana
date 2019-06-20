/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'hapi';

import { CloudPlugin } from '../legacy/plugins/cloud';
import { EncryptedSavedObjectsPlugin } from '../legacy/plugins/encrypted_saved_objects';
import { XPackMainPlugin } from '../legacy/plugins/xpack_main/xpack_main';
import { SecurityPlugin } from '../legacy/plugins/security';

declare module 'hapi' {
  interface PluginProperties {
    cloud?: CloudPlugin;
    xpack_main: XPackMainPlugin;
    security?: SecurityPlugin;
    encrypted_saved_objects?: EncryptedSavedObjectsPlugin;
  }
}
