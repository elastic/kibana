/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TEMPORARY — DELETE ON MERGE OF elastic/kibana#289683.
 *
 * Verbatim copy of `agentic_investigations/common/proposals/constants.ts`. After that PR merges,
 * replace every import of `../../common/proposals/constants` in this plugin with the plugin's own
 * export and delete this file. Keep `attachment.ts` — it is owned here.
 */

export const AGENTIC_INVESTIGATIONS_API_VERSION = '1' as const;
export const PROPOSALS_INTERNAL_URL = '/internal/investigations/proposals' as const;
