/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalOrigin } from '@kbn/proposals-common';

/**
 * AlertZero's member of the shared origin vocabulary: stamped on every proposal
 * its Workers raise, and the exact value both queues filter on.
 *
 * `satisfies` rather than a bare string so a typo is a compile error instead of
 * a proposal that matches no queue.
 */
export const ALERTZERO_PROPOSAL_ORIGIN = 'alertzero' satisfies ProposalOrigin;
