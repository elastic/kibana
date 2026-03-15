/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';

const getAuth = (url: URL): string | undefined => {
  if (!url.username && !url.password) {
    return undefined;
  }

  return `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
};

const setAuth = (url: URL, auth?: string): URL => {
  const nextUrl = new URL(url.toString());

  if (!auth) {
    return nextUrl;
  }

  const separatorIndex = auth.indexOf(':');
  nextUrl.username = separatorIndex >= 0 ? auth.slice(0, separatorIndex) : auth;
  nextUrl.password = separatorIndex >= 0 ? auth.slice(separatorIndex + 1) : '';

  return nextUrl;
};

const stripAuth = (url: URL): URL => {
  const nextUrl = new URL(url.toString());
  nextUrl.username = '';
  nextUrl.password = '';
  return nextUrl;
};

const getAuthHeaders = (url: URL): Record<string, string> => {
  const auth = getAuth(url);

  if (!auth) {
    return {};
  }

  return { Authorization: `Basic ${Buffer.from(auth).toString('base64')}` };
};

async function discoverAuth(parsedTarget: URL, log: ToolingLog) {
  const possibleCredentials = [`admin:changeme`, `elastic:changeme`];
  for (const auth of possibleCredentials) {
    const url = setAuth(parsedTarget, auth);
    let status: number;
    try {
      log.debug(`Fetching ${stripAuth(url)}`);
      const response = await fetch(stripAuth(url).toString(), {
        headers: getAuthHeaders(url),
      });
      status = response.status;
    } catch (err) {
      log.debug(`${stripAuth(url)} resulted in ${err.message}`);
      status = 0;
    }

    if (status === 200) {
      return auth;
    }
  }

  throw new Error(`Failed to authenticate user for ${stripAuth(parsedTarget)}`);
}

async function getKibanaUrl({ kibana, log }: { kibana: string; log: ToolingLog }) {
  try {
    const isCI = process.env.CI?.toLowerCase() === 'true';

    const parsedKibanaUrl = new URL(kibana);
    const kibanaUrlWithoutAuth = stripAuth(parsedKibanaUrl);

    log.debug(`Checking Kibana URL ${kibanaUrlWithoutAuth} for a redirect`);

    const unredirectedResponse = await fetch(kibanaUrlWithoutAuth.toString(), {
      headers: getAuthHeaders(parsedKibanaUrl),
      method: 'HEAD',
      redirect: 'manual',
    });

    log.debug('Unredirected response', unredirectedResponse.headers.get('location'));

    const discoveredKibanaUrl = new URL(
      unredirectedResponse.headers
        .get('location')
        ?.replace('/spaces/enter', '')
        ?.replace('spaces/space_selector', '') || kibanaUrlWithoutAuth.toString(),
      kibanaUrlWithoutAuth
    );

    log.debug(`Discovered Kibana URL at ${discoveredKibanaUrl}`);

    const discoveredKibanaUrlWithAuth = setAuth(discoveredKibanaUrl, getAuth(parsedKibanaUrl));
    const redirectedResponse = await fetch(stripAuth(discoveredKibanaUrlWithAuth).toString(), {
      method: 'HEAD',
      headers: getAuthHeaders(discoveredKibanaUrlWithAuth),
    });

    if (redirectedResponse.status !== 200) {
      throw new Error(
        `Expected HTTP 200 from ${discoveredKibanaUrlWithAuth}, got ${redirectedResponse.status}`
      );
    }

    const discoveredKibanaUrlWithoutAuth = stripAuth(discoveredKibanaUrlWithAuth);

    log.info(
      `Discovered kibana running at: ${
        isCI ? discoveredKibanaUrlWithoutAuth : discoveredKibanaUrlWithAuth
      }`
    );

    return discoveredKibanaUrlWithAuth.toString().replace(/\/$/, '');
  } catch (error) {
    throw new Error(`Could not connect to Kibana: ` + error.message);
  }
}

export async function getServiceUrls({
  log,
  elasticsearch,
  kibana,
}: {
  elasticsearch: string;
  kibana: string;
  log: ToolingLog;
}) {
  if (!elasticsearch) {
    // assume things are running locally
    kibana = kibana || 'http://127.0.0.1:5601';
    elasticsearch = 'http://127.0.0.1:9200';
  }

  const parsedTarget = new URL(elasticsearch);
  let auth = getAuth(parsedTarget);

  if (!auth) {
    auth = await discoverAuth(parsedTarget, log);
  }

  const formattedEsUrl = setAuth(parsedTarget, auth).toString();

  const suspectedKibanaUrl = kibana || elasticsearch.replace('.es', '.kb');
  const parsedKibanaUrl = new URL(suspectedKibanaUrl);
  const kibanaUrlWithAuth = setAuth(parsedKibanaUrl, getAuth(parsedKibanaUrl) || auth).toString();

  const validatedKibanaUrl = await getKibanaUrl({ kibana: kibanaUrlWithAuth, log });

  return {
    kibanaUrl: validatedKibanaUrl,
    esUrl: formattedEsUrl,
  };
}
