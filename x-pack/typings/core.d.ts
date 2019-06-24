/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClient } from 'src/core/server/saved_objects';

declare module 'src/core/server/saved_objects' {
  type SavedObjectsNamespace = string | undefined | symbol;
  interface SavedObjectsBaseOptions {
    namespace?: SavedObjectsNamespace;
  }
}
