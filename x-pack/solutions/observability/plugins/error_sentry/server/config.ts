/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

export const configSchema = schema.object({
  github: schema.object({
    /**
     * GitHub API token used by the `error-sentry.createGithubIssue` step. When unset, the step
     * is a safe no-op (it logs and reports `skipped: true`) so the workflow can run on a dev
     * machine without writing to GitHub. Provide it via the keystore in real deployments.
     */
    apiToken: schema.maybe(schema.string()),
    owner: schema.string({ defaultValue: 'elastic' }),
    repo: schema.string({ defaultValue: 'observability-error-backlog' }),
  }),
});

export type ErrorSentryConfig = TypeOf<typeof configSchema>;
export type ErrorSentryGithubConfig = ErrorSentryConfig['github'];

export const config: PluginConfigDescriptor<ErrorSentryConfig> = {
  schema: configSchema,
};
