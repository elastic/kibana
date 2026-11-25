/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';

/** The theme's vis colours, each named after its token, so tests can tell which one was picked. */
export const TEST_VIS_COLORS = new Proxy(
  {},
  { get: (_, token) => String(token) }
) as EuiThemeComputed['colors']['vis'];
