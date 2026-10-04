/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCACertificates, type ConnectionOptions } from 'tls';
import { Client } from '@elastic/elasticsearch';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export interface ConnectionConfig {
  esUrl: string;
  kibanaUrl: string;
  username: string;
  password: string;
}

/** Default superuser credentials of `node scripts/es snapshot` and `node scripts/es serverless`, tried in order. */
const DEFAULT_CREDENTIALS = [
  { username: 'elastic', password: 'changeme' },
  { username: 'elastic_serverless', password: 'changeme' },
] as const;

interface KibanaConfig {
  elasticsearch: { hosts: string };
  server: { host: string; port: number; basePath: string };
}

/** Reads kibana.dev.yml (flat or nested keys) and applies env var overrides. */
function readKibanaConfig(log: ToolingLog): KibanaConfig {
  const configPath = path.resolve(process.cwd(), 'config/kibana.dev.yml');

  let esValues: Record<string, unknown> = {};
  let serverValues: Record<string, unknown> = {};

  if (fs.existsSync(configPath)) {
    const loaded = (yaml.parse(fs.readFileSync(configPath, 'utf8')) || {}) as Record<
      string,
      unknown
    >;
    // Support both flat keys (elasticsearch.hosts) and nested objects.
    const esNested = (loaded.elasticsearch ?? {}) as Record<string, unknown>;
    const serverNested = (loaded.server ?? {}) as Record<string, unknown>;
    esValues = {
      hosts: loaded['elasticsearch.hosts'] ?? esNested.hosts,
    };
    serverValues = {
      host: loaded['server.host'] ?? serverNested.host,
      port: loaded['server.port'] ?? serverNested.port,
      basePath: loaded['server.basePath'] ?? serverNested.basePath,
    };
  } else {
    log.warning(`Config file not found at ${configPath}; using defaults.`);
  }

  const rawPort = serverValues.port;
  const port =
    typeof rawPort === 'number'
      ? rawPort
      : typeof rawPort === 'string'
      ? parseInt(rawPort, 10) || 5601
      : 5601;

  return {
    elasticsearch: {
      hosts: String(process.env.ELASTICSEARCH_HOST || esValues.hosts || 'http://localhost:9200'),
    },
    server: {
      host: String(process.env.KIBANA_HOST || serverValues.host || 'localhost'),
      port: process.env.KIBANA_PORT ? parseInt(process.env.KIBANA_PORT, 10) : port,
      basePath: typeof serverValues.basePath === 'string' ? serverValues.basePath : '',
    },
  };
}

/**
 * Detects the Kibana dev-mode base path by making a request to the root URL and
 * following the 3xx redirect to a path like `/ftw`. Falls back to the input URL.
 */
async function resolveKibanaUrl(rawUrl: string, log: ToolingLog): Promise<string> {
  try {
    const response = await fetch(rawUrl, {
      method: 'GET',
      redirect: 'manual',
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') ?? '';
      let pathname: string;
      try {
        pathname = new URL(location).pathname;
      } catch {
        pathname = location;
      }
      // Kibana dev mode generates a random 3-char base path (e.g. /ftw) and redirects to it.
      if (/^\/\w{3}$/.test(pathname)) {
        const resolved = `${rawUrl}${pathname}`;
        log.debug(`Detected dev mode base path: ${pathname}, resolved URL: ${resolved}`);
        return resolved;
      }
    }
  } catch (err) {
    log.warning(
      `resolveKibanaUrl: could not probe ${rawUrl} (${
        err instanceof Error ? err.message : String(err)
      }) — Kibana may be unreachable; using URL as-is`
    );
  }
  return rawUrl;
}

/** Trusts the Kibana dev CA for https connections to localhost (used by `node scripts/es serverless`). */
export function getEsTlsOptions(esUrl: string): ConnectionOptions | undefined {
  const { protocol, hostname } = new URL(esUrl);
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  return protocol === 'https:' && isLocalhost
    ? { ca: [...getCACertificates('default'), fs.readFileSync(CA_CERT_PATH)] }
    : undefined;
}

async function canAuthenticate(
  esUrl: string,
  username: string,
  password: string
): Promise<boolean> {
  const client = new Client({
    node: esUrl,
    auth: { username, password },
    tls: getEsTlsOptions(esUrl),
    requestTimeout: 5_000,
    maxRetries: 0,
  });
  try {
    await client.security.authenticate();
    return true;
  } catch {
    return false;
  } finally {
    await client.close();
  }
}

function withSwitchedProtocol(url: string): string {
  const parsed = new URL(url);
  parsed.protocol = 'https:';
  return parsed.toString().replace(/\/$/, '');
}

/**
 * Finds a working ES URL + superuser credential pair. Explicit flags are always honoured;
 * otherwise local HTTP can fall back to HTTPS and the stateful/serverless default users are probed.
 */
async function discoverEsConnection(
  flags: Record<string, unknown>,
  configuredEsUrl: string,
  log: ToolingLog
): Promise<{ esUrl: string; username: string; password: string }> {
  const targetEsUrl = String(flags['es-url'] || configuredEsUrl);
  const { protocol, hostname } = new URL(targetEsUrl);
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const esUrls =
    !flags['es-url'] && protocol === 'http:' && isLocalhost
      ? [targetEsUrl, withSwitchedProtocol(targetEsUrl)]
      : [targetEsUrl];
  const usernames = flags['es-username']
    ? [String(flags['es-username'])]
    : DEFAULT_CREDENTIALS.map(({ username }) => username);
  const credentials = usernames.map((username) => ({
    username,
    password: String(flags['es-password'] || 'changeme'),
  }));

  for (const esUrl of esUrls) {
    for (const { username, password } of credentials) {
      if (await canAuthenticate(esUrl, username, password)) {
        log.info(`Connected to Elasticsearch at ${esUrl} as "${username}"`);
        return { esUrl, username, password };
      }
    }
  }

  throw new Error(
    `Could not authenticate against Elasticsearch at ${esUrls.join(' or ')} with users ${credentials
      .map(({ username }) => username)
      .join(', ')} — pass --es-url / --es-username / --es-password explicitly.`
  );
}

export async function getConnectionConfig(
  flags: Record<string, unknown>,
  log: ToolingLog
): Promise<ConnectionConfig> {
  const { elasticsearch, server: serverConfig } = readKibanaConfig(log);

  // kibana.dev.yml carries kibana_system credentials — the seeder needs superuser access to
  // write system indices and seed data, so it probes the default dev superusers instead.
  const { esUrl, username, password } = await discoverEsConnection(flags, elasticsearch.hosts, log);

  const rawKibanaUrl = flags['kibana-url']
    ? String(flags['kibana-url'])
    : `http://${serverConfig.host}:${serverConfig.port}${serverConfig.basePath}`;
  log.debug(`Kibana raw URL: ${rawKibanaUrl}`);
  // Always probe for dev-mode base path — even when --kibana-url is provided explicitly,
  // so that http://localhost:5601 is auto-resolved to http://localhost:5601/ftw etc.
  const kibanaUrl = await resolveKibanaUrl(rawKibanaUrl, log);

  return { esUrl, kibanaUrl, username, password };
}
