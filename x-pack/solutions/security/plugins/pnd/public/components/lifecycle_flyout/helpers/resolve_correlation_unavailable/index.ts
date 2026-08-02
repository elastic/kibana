/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isCorrelationUnavailable } from '../../../lifecycle_view';
import type { PndExecutionQueryResult } from '../../../../hooks/use_pnd_execution';

/**
 * Whether the overlay should show "we could not correlate a run" instead of a summary of nothing.
 *
 * The same rule `LifecycleView` applies, lifted so the Overview and Timeline tabs cannot drift from
 * it: three tabs reading one projection must not disagree about whether that projection found a run.
 *
 * The server's own answer wins over the client-side guess, in **both** directions: a `true` keeps a
 * legitimately-early run out of the could-not-correlate screen, and a `false` puts an older
 * discovery into it even if some row happens to name a run. The guess is only for a response that
 * carried no signal at all — an older server, or a proxy that dropped the header.
 */
export const resolveCorrelationUnavailable = (data: PndExecutionQueryResult | undefined): boolean =>
  data != null &&
  (data.isCorrelated === false ||
    (data.isCorrelated == null && isCorrelationUnavailable(data.execution.steps)));
