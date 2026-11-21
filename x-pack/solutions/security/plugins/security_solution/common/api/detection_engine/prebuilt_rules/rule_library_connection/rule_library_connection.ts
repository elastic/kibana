/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_URL_LENGTH = 2048;
const MAX_TEXT_LENGTH = 256;
const MAX_SECRET_LENGTH = 4096;

const GIT_URL_PATTERN = /^(https:\/\/|ssh:\/\/)\S+$|^[\w.-]+@[\w.-]+:\S+$/;
const S3_URL_PATTERN = /^https?:\/\/\S+$/;

const ProviderConnection = lazySchema(() =>
  z
    .object({
      type: z.enum(['git', 's3']),
      url: z.string().min(1).max(MAX_URL_LENGTH),
      branch: z.string().max(MAX_TEXT_LENGTH).optional(),
      region: z.string().max(MAX_TEXT_LENGTH).optional(),
      auth_type: z.enum(['none', 'token', 'ssh_key', 's3_access_key']).default('none'),
      username: z.string().max(MAX_TEXT_LENGTH).optional(),
      known_hosts: z.string().max(MAX_SECRET_LENGTH).optional(),
    })
    .strict()
);

/** The fields that say how to reach a library. They are shared by the scan and the create requests. */
export const ruleLibraryConnectionFields = {
  provider: ProviderConnection,
  // Token, private key or secret access key, depending on the auth type. Never returned by any route.
  secret: lazySchema(() => z.string().max(MAX_SECRET_LENGTH).optional()),
  pinned_version: lazySchema(() => z.string().max(MAX_TEXT_LENGTH).optional()),
};

interface ConnectionValue {
  provider: z.infer<typeof ProviderConnection>;
  secret?: string;
}

/** Checks that the url fits the provider and that the authentication has what it needs. */
export const refineRuleLibraryConnection = (
  { provider, secret }: ConnectionValue,
  context: {
    addIssue: (issue: { code: 'custom'; path: string[]; message: string }) => void;
  }
): void => {
  const urlPattern = provider.type === 'git' ? GIT_URL_PATTERN : S3_URL_PATTERN;
  if (!urlPattern.test(provider.url)) {
    context.addIssue({
      code: 'custom',
      path: ['provider', 'url'],
      message:
        provider.type === 'git'
          ? 'Enter an HTTPS or SSH repository URL'
          : 'Enter an http or https bucket URL',
    });
  }
  if (provider.auth_type !== 'none' && !secret) {
    context.addIssue({
      code: 'custom',
      path: ['secret'],
      message: `The "${provider.auth_type}" authentication needs a secret`,
    });
  }
  if (
    (provider.auth_type === 'ssh_key' || provider.auth_type === 's3_access_key') &&
    !provider.username
  ) {
    context.addIssue({
      code: 'custom',
      path: ['provider', 'username'],
      message: `The "${provider.auth_type}" authentication needs a username`,
    });
  }
  if (provider.auth_type === 'ssh_key' && !provider.known_hosts) {
    context.addIssue({
      code: 'custom',
      path: ['provider', 'known_hosts'],
      message: 'SSH needs the known hosts of the repository server',
    });
  }
};

/** The connection settings of a library, as the page collects them. */
export type RuleLibraryConnection = z.infer<typeof RuleLibraryConnection>;
export const RuleLibraryConnection = lazySchema(() =>
  z.object(ruleLibraryConnectionFields).strict().superRefine(refineRuleLibraryConnection)
);
