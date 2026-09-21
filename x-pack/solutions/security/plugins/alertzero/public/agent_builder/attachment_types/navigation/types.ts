/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ApplicationStart } from '@kbn/core-application-browser';

export interface AttachmentNavigationDeps {
  share?: SharePluginStart;
  /** Active Kibana space id; never empty. */
  spaceId: string;
  /**
   * `core.http.basePath.prepend`. Includes the `/s/{spaceId}` prefix when the
   * user is in a non-default space, so Security alert-details paths resolve correctly.
   */
  prependPath: (path: string) => string;
  /**
   * `core.application.getUrlForApp`. Optional: absent in older callers and in
   * tests that don't need Security entity-page links, in which case host/user
   * chips fall back to their Discover ES|QL link.
   */
  getUrlForApp?: ApplicationStart['getUrlForApp'];
}
