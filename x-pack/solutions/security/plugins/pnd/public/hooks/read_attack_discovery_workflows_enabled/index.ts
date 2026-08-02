/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER } from '../../../common/constants';
import { readPndSignalHeader } from '../read_pnd_signal_header';

/**
 * Reads the Attack Discovery 2.0 signal header both list routes stamp.
 *
 * `GET /internal/pnd/proposals` and `GET /internal/pnd/runs` both early-return an
 * empty body when `securitySolution:enableAttackDiscoveryWorkflows` is off in the
 * space, and both say so in a **header** because the body is a closed generated
 * shape with nowhere to put it. Reading the body alone makes a configuration
 * state look like an empty queue, so this is the difference between "nothing to
 * do" and "the loop can never start here".
 *
 * Only the two values the server stamps are believed. Anything else — a proxy
 * that dropped the header, an older server — leaves the flag `undefined`, which
 * is not the same claim as `false`: the UI then says "nothing here" rather than
 * blaming a setting that may well be on.
 *
 * Shared by both hooks on purpose. It was private to `use_proposals_api` first;
 * the runs table is the second consumer, and a second copy would be one drift
 * away from the two lists disagreeing about the same header.
 *
 * The reading rule itself lives in {@link readPndSignalHeader}, which the
 * four-phase view's `x-pnd-execution-correlated` read also goes through, so PND's
 * two signal headers can never end up being interpreted differently.
 */
export const readAttackDiscoveryWorkflowsEnabled = (
  response: Response | undefined
): boolean | undefined =>
  readPndSignalHeader(response, PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER);
