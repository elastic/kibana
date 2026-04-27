/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class EntityStoreNotInstalledError extends Error {
  constructor() {
    super(
      'Entity Store is not installed. Install it via POST /api/security/entity_store/install or from the Security Entity Store page, then retry.'
    );
  }
}
