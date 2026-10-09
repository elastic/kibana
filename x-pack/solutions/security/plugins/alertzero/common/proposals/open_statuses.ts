/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * An "active" Hunt Proposal, per the selection contract: awaiting a decision, or
 * decided and currently running. The remaining statuses (`expired`, `failed`,
 * `no_action`, `succeeded`) are terminal, so a report carrying only those is
 * free to be hunted again, and an Investigation carrying only those is free to be
 * dismissed.
 */
export const OPEN_PROPOSAL_STATUSES = ['pending', 'executing'] as const;
