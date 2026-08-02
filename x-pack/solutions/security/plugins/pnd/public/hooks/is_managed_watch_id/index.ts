/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_IDS } from '@kbn/pnd-common';

/**
 * Whether a watch id is one of the five managed catalog watches.
 *
 * The browser mirror of the server's `isSystemSecurityWatchId` allow-list: both
 * autonomy routes **400** any id outside it (security finding S4 — the id becomes
 * a `pnd:autonomy:<watchId>` uiSettings key written by an internal client with no
 * saved-object authz), and only these five have a registered uiSetting to read.
 *
 * So the UI must not ask about a custom watch: doing so would render a read error
 * on a page that is otherwise fine. The server check remains the control — this
 * one only decides whether to make the call.
 */
export const isManagedWatchId = (watchId: string | undefined): boolean =>
  watchId != null && (SYSTEM_SECURITY_WATCH_IDS as readonly string[]).includes(watchId);
