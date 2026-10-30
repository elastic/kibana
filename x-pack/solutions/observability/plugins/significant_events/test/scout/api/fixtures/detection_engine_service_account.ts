/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, KibanaUrl, SamlAuth, ScoutLogger } from '@kbn/scout-oblt';
import {
  DETECTION_ENGINE_SERVICE_ACCOUNT_NAME,
  DETECTION_ENGINE_SERVICE_ACCOUNT_ROLE,
} from '../../../../common/service_account';
import { COMMON_API_HEADERS } from './constants';

const SERVICE_ACCOUNT_LIST_PATH = '/internal/security/service_account';
const SETUP_PATH = '/internal/significant_events/service_account/_enable';

/** Setup needs the workflows plugin ready, which a cold start can still be working on. */
const ENABLE_TIMEOUT_MS = 120_000;
const ENABLE_RETRY_INTERVAL_MS = 5_000;

/**
 * Serverless defines the account's role in elasticsearch-controller, which this stack does not
 * have yet, so the account holds a built-in project role there. Nothing in these suites runs a
 * detection as the account.
 * TODO: use the detection engine role once elasticsearch-controller defines it.
 */
const SERVERLESS_ROLE = 'admin';

/**
 * Local Serverless suites create their service accounts as the mock IdP's organization admin, as
 * the other service account suites do. On Cloud that development key cannot authenticate, so the
 * admin's session creates the account.
 *
 * TODO: this may not be needed. The 403 on the token exchange that led here was the Kibana
 * certificate naming a search project (see `withUiamCertOfProject`), not who created the account,
 * and the Serverless FTR suite creates its account from the admin's session without trouble. Once
 * elasticsearch-controller defines the detection engine role, try creating the account from the
 * admin's session here too, and drop this key.
 */
// Copied from `MOCK_IDP_UIAM_ORG_ADMIN_API_KEY` in `@kbn/mock-idp-utils`, a private platform package
// this plugin cannot import.
const MOCK_IDP_UIAM_ORG_ADMIN_API_KEY =
  'essu_dev_TnpKcmMyVTFkMEo2WW5scU5XUm9PVWw2TVRNNmJqSXRVbWxTVEZNeVowNVRkMWhUVWpCd1l6SjBadz09AAAAAN10T0s=';

const LOCAL_SERVERLESS_ACCOUNT_CREATION_HEADERS = {
  authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
};

interface ServiceAccount {
  id: string;
  name: string;
}

/** The account the detection engine runs as, if it exists: the directory is paginated. */
const findDetectionEngineAccount = async (
  request: ReturnType<typeof createAdminRequester>
): Promise<ServiceAccount | undefined> => {
  let after: string | undefined;
  do {
    const query = new URLSearchParams({ limit: '100', ...(after ? { after } : {}) });
    const { serviceAccounts, nextPage } = await request<{
      serviceAccounts: ServiceAccount[];
      nextPage?: string;
    }>(`${SERVICE_ACCOUNT_LIST_PATH}?${query}`, { method: 'GET' });
    const account = serviceAccounts.find(
      ({ name }) => name === DETECTION_ENGINE_SERVICE_ACCOUNT_NAME
    );
    if (account) {
      return account;
    }
    after = nextPage;
  } while (after !== undefined);
  return undefined;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Requests as the deployment's admin, who holds the `manage_security` that creating an account
 * and binding a workflow to it require.
 *
 * Plain `fetch` with the admin's session cookie, rather than `kbnClient`: that client always
 * authenticates with the deployment's native superuser, which UIAM rejects on Serverless with
 * "Provided credential is not compatible with UIAM".
 */
const createAdminRequester =
  (kbnUrl: KibanaUrl, cookieHeader: Record<string, string>) =>
  async <T>(
    path: string,
    {
      method,
      body,
      headers,
    }: { method: 'GET' | 'POST'; body?: string; headers?: Record<string, string> }
  ): Promise<T> => {
    const response = await fetch(new URL(kbnUrl.get(path)), {
      method,
      headers: {
        ...COMMON_API_HEADERS,
        ...(headers ?? cookieHeader),
        'content-type': 'application/json',
      },
      ...(body ? { body } : {}),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`[${method} ${path}] ${response.status}: ${text}`);
    }
    return JSON.parse(text || '{}');
  };

/**
 * Sets a space, the default one unless told otherwise, up to run the detection engine as a service
 * account: the role on stateful, the account, and the space's bound workflows. Without it, pausing
 * and resuming Significant Events are refused.
 *
 * Runs once for the default space for the whole suite (`global.setup.ts`), not per worker: the
 * account belongs to the deployment, and concurrent creates of the same account conflict. A spec
 * that creates another space sets it up with the same call.
 */
export const setUpDetectionEngineServiceAccount = async ({
  kbnUrl,
  esClient,
  samlAuth,
  isServerless,
  isCloud,
  log,
  spaceId,
}: {
  kbnUrl: KibanaUrl;
  esClient: EsClient;
  samlAuth: SamlAuth;
  isServerless: boolean;
  isCloud: boolean;
  log: ScoutLogger;
  spaceId?: string;
}): Promise<void> => {
  if (!isServerless) {
    await esClient.security.putRole({
      name: DETECTION_ENGINE_SERVICE_ACCOUNT_NAME,
      ...DETECTION_ENGINE_SERVICE_ACCOUNT_ROLE,
    });
  }
  const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
  const request = createAdminRequester(kbnUrl, cookieHeader);

  const { id } =
    (await findDetectionEngineAccount(request)) ??
    (await request<ServiceAccount>(SERVICE_ACCOUNT_LIST_PATH, {
      method: 'POST',
      ...(isServerless && !isCloud ? { headers: LOCAL_SERVERLESS_ACCOUNT_CREATION_HEADERS } : {}),
      body: JSON.stringify({
        name: DETECTION_ENGINE_SERVICE_ACCOUNT_NAME,
        description: 'The service account the Nightshift detection engine runs as.',
        roles: [isServerless ? SERVERLESS_ROLE : DETECTION_ENGINE_SERVICE_ACCOUNT_NAME],
      }),
    }));

  const deadline = Date.now() + ENABLE_TIMEOUT_MS;
  let last = '';
  while (Date.now() < deadline) {
    try {
      await request(`${spaceId ? `/s/${spaceId}` : ''}${SETUP_PATH}`, {
        method: 'POST',
        body: JSON.stringify({ serviceAccountIds: { detectionEngine: id } }),
      });
      log.info(`The detection engine runs as [${id}] in the ${spaceId ?? 'default'} space`);
      return;
    } catch (error) {
      last = String(error);
      log.debug(`The detection engine setup is not ready yet, retrying. Last result ${last}`);
      await sleep(ENABLE_RETRY_INTERVAL_MS);
    }
  }
  throw new Error(
    `The detection engine setup did not finish within ${ENABLE_TIMEOUT_MS}ms. Last result ${last}`
  );
};
