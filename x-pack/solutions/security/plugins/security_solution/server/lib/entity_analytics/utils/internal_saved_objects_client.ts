/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-server';

/**
 * Builds an internal SavedObjectsClient whose operations default to the given namespace.
 * Use with caution, and only where a real kibana request is not available (e.g. a task manager task).
 *
 * Internal clients never have the security extension, because there is no user behind them. This has (negative) implications both for logging and for security.
 */
export const buildNamespacedInternalSavedObjectsClientUnsafe = ({
  coreStart,
  namespace,
  includedHiddenTypes,
}: {
  coreStart: CoreStart;
  namespace: string;
  includedHiddenTypes?: string[];
}) =>
  coreStart.savedObjects
    .getUnsafeInternalClient({ includedHiddenTypes })
    .asScopedToNamespace(namespace);
