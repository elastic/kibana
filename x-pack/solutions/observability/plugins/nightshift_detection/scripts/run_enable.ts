/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import {
  createHttpServiceAccountsApi,
  ensureNightshiftServiceAccount,
} from '@kbn/nightshift-shared';

const ENABLE_PATH = '/internal/nightshift/detection/service_account/_enable';

/** Carries the status of a failed request, which the account setup reads for `404` and `409`. */
class RequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'RequestError';
  }
}

function hasStatus(error: unknown): error is { status: number } {
  return error instanceof RequestError;
}

/**
 * Sets a space up to run the detection engine: finds or creates the deployment's
 * `nightshift_detection` service account, then binds the space to it with `_enable`. Run it
 * as a user with `manage_security`. Safe to run again: the account and the binding are reused.
 */
run(
  async ({ flags, log }) => {
    const spaceId = String(flags.space);
    const kibanaUrl = String(flags['kibana-url']).replace(/\/$/, '');
    // Local Serverless has no `elastic` user: its superuser is `elastic_serverless`.
    const username = flags.username
      ? String(flags.username)
      : getDefaultUsername(Boolean(flags.serverless));
    const authorization = `Basic ${Buffer.from(`${username}:${String(flags.password)}`).toString(
      'base64'
    )}`;

    const request = async <T>(
      path: string,
      {
        method,
        query,
        body,
        version,
      }: {
        method: 'GET' | 'POST';
        query?: Record<string, string | number>;
        body?: string;
        version?: string;
      }
    ): Promise<T> => {
      const url = new URL(`${kibanaUrl}${path}`);
      Object.entries(query ?? {}).forEach(([key, value]) =>
        url.searchParams.set(key, String(value))
      );

      const response = await fetch(url, {
        method,
        body,
        headers: {
          authorization,
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'kibana',
          ...(version ? { 'elastic-api-version': version } : {}),
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
      });
      const text = await response.text();

      if (!response.ok) {
        throw new RequestError(`[${method} ${path}] ${response.status}: ${text}`, response.status);
      }

      return (text ? JSON.parse(text) : undefined) as T;
    };

    const serviceAccountId = await ensureNightshiftServiceAccount(
      createHttpServiceAccountsApi({
        request,
        getStatus: (error) => (hasStatus(error) ? error.status : undefined),
      }),
      { kind: 'detection', isServerless: Boolean(flags.serverless) }
    );

    const spacePath = spaceId === 'default' ? '' : `/s/${spaceId}`;
    await request(`${spacePath}${ENABLE_PATH}`, {
      method: 'POST',
      body: JSON.stringify({ serviceAccountId }),
    });

    log.success(`Space [${spaceId}] runs the detection engine as [${serviceAccountId}]`);
  },
  {
    description: 'Sets a space up to run the Nightshift detection engine as its service account.',
    flags: {
      string: ['space', 'kibana-url', 'username', 'password'],
      boolean: ['serverless'],
      default: {
        space: 'default',
        'kibana-url': 'http://localhost:5601',
        password: 'changeme',
        serverless: false,
      },
      help: `
        --space <id>          Space to set up (default: default)
        --kibana-url <url>    Kibana to call (default: http://localhost:5601)
        --username <user>     User with manage_security (default: elastic, or elastic_serverless with --serverless)
        --password <pass>     Its password (default: changeme)
        --serverless          The deployment is Serverless, so the account holds the predefined role
      `,
    },
  }
);

function getDefaultUsername(isServerless: boolean): string {
  return isServerless ? 'elastic_serverless' : 'elastic';
}
