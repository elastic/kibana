/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { isAgentNotFoundError, isAgentUnavailableError } from '@kbn/agent-builder-common';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '@kbn/nightshift-investigations-plugin/server';
import {
  RelayRequestError,
  type InMemoryConnector,
  type RelayClientContract,
} from '@kbn/actions-plugin/server';
import { RELAY_AUTH_ID } from '@kbn/connector-specs';
import type { SignificantEventsServer } from '../../types';
import type {
  SlackAppBindingsResponse,
  SlackAppConnectResponse,
  SlackAppDisconnectResponse,
  SlackAppStatusResponse,
} from '../../../common/slack_app/types';
import { RELAY_APP_CONNECTION_STATUS } from '../../../common/slack_app/types';
import { STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG } from '../../../common/feature_flags';
import {
  RELAY_APP_CONNECTION_SO_ID,
  RELAY_APP_CONNECTION_SO_TYPE,
  type RelayAppConnectionAttributes,
} from './saved_object';
import { SlackAppUnavailableError } from './errors';
import { getKibanaUrl } from './get_kibana_url';

/**
 * One instance per deployment, under a stable id: rules and workflows reference it directly, so it
 * must survive restarts and reconnects unchanged.
 */
export const ELASTIC_APPS_SLACK_CONNECTOR_ID = 'elastic-apps-slack';

/** The Elastic Slack app is not its own connector type — it is the `relay` auth method on this one. */
const ELASTIC_APPS_SLACK_CONNECTOR_TYPE_ID = '.slack2';

const ELASTIC_APPS_SLACK_CONNECTOR_NAME = 'Slack (Elastic app)';

const RELAY_SERVICE_ACCOUNT_NAME_PREFIX = 'nightshift-relay-agent-builder';

const RELAY_SERVICE_ACCOUNT_ROLES = ['viewer'];

/**
 * Selects the server-owned Relay platform assumer. The id (`relay-service`) is
 * resolved inside the security plugin; this call cannot name another principal.
 */
const RELAY_PLATFORM_ASSUMERS = ['relay'] as const;

const buildConnector = (tenantKey: string): InMemoryConnector => ({
  id: ELASTIC_APPS_SLACK_CONNECTOR_ID,
  actionTypeId: ELASTIC_APPS_SLACK_CONNECTOR_TYPE_ID,
  name: ELASTIC_APPS_SLACK_CONNECTOR_NAME,
  // The Relay holds the Slack credentials, so naming the workspace is all this needs. `config`
  // mirrors the auth type in plaintext, as `ensureConfigAuthType` does for saved connectors.
  config: { authType: RELAY_AUTH_ID },
  secrets: { authType: RELAY_AUTH_ID, tenantKey },
  isMissingSecrets: false,
  isPreconfigured: true,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
  // Events are on for this connector.
  isInboundEventsEnabled: true,
});

/** Pagination options for a single page of connected channels. */
export interface ListBindingsOptions {
  /** Opaque cursor from a previous page's `nextCursor`; omit for the first page. */
  cursor?: string;
  /** Max entries to return in this page. */
  perPage?: number;
}

export class SlackAppService {
  private readonly logger: Logger;

  /**
   * An id collision clears only by editing `kibana.yml` and restarting, so the reconcile loop would
   * otherwise repeat the warning every interval for the life of the process.
   */
  private idTakenWarned = false;

  constructor(private readonly server: SignificantEventsServer) {
    this.logger = server.logger.get('slack-app');
  }

  /**
   * feature flag on + `xpack.actions.relay` configured (the injected singleton client exists) +
   * agentBuilder available on this deployment.
   */
  private async getRelayClient(): Promise<RelayClientContract | undefined> {
    const { relayClient, agentBuilder } = this.server;
    if (!relayClient || !agentBuilder) {
      return undefined;
    }
    const enabled = await firstValueFrom(
      this.server.core.featureFlags.getBooleanValue$(
        STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG,
        false
      )
    );
    return enabled ? relayClient : undefined;
  }

  private getSoClient(request: KibanaRequest): SavedObjectsClientContract {
    return this.server.core.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [RELAY_APP_CONNECTION_SO_TYPE],
    });
  }

  /**
   * Unregisters first because `registerDynamicConnector` is a no-op when the id is taken, so a
   * reconnect to a different workspace would otherwise keep serving the previous tenant key.
   *
   * When the id is held by a connector this app does not own (a preconfigured `elastic-apps-slack`
   * in `kibana.yml`) the unregister leaves it in place and the register is refused, so the call must
   * not be treated as having taken effect.
   */
  private publishConnector(tenantKey: string): void {
    this.server.actions.unregisterDynamicConnector(ELASTIC_APPS_SLACK_CONNECTOR_ID);

    if (this.server.actions.registerDynamicConnector(buildConnector(tenantKey))) {
      this.logger.debug(`Registered the ${ELASTIC_APPS_SLACK_CONNECTOR_ID} connector`);
      this.idTakenWarned = false;
      return;
    }

    if (!this.idTakenWarned) {
      this.idTakenWarned = true;
      this.logger.warn(
        `Could not register the "${ELASTIC_APPS_SLACK_CONNECTOR_ID}" connector: a connector with that id already exists and is not managed by the Elastic Slack app. Remove it from your Kibana configuration so the Elastic Slack app can own the id.`
      );
    }
  }

  private withdrawConnector(): void {
    if (this.server.actions.unregisterDynamicConnector(ELASTIC_APPS_SLACK_CONNECTOR_ID)) {
      this.logger.debug(`Unregistered the ${ELASTIC_APPS_SLACK_CONNECTOR_ID} connector`);
    }
  }

  /**
   * Lets a reconcile tell "already correct" from "registered for the wrong workspace". Matches on
   * `isDynamic` as well as the id, because only dynamic connectors are ones this app registered and
   * can unregister: a foreign connector squatting the id must never read as already correct.
   */
  private getRegisteredTenantKey(): string | undefined {
    const connector = this.server.actions.inMemoryConnectors.find(
      ({ id, isDynamic }) => id === ELASTIC_APPS_SLACK_CONNECTOR_ID && isDynamic === true
    );
    const tenantKey = (connector?.secrets as { tenantKey?: unknown } | undefined)?.tenantKey;
    return typeof tenantKey === 'string' ? tenantKey : undefined;
  }

  /**
   * Brings this process's connector in line with the stored connection. In-memory connectors are
   * per-process, so a connect handled by another node only reaches here. Safe to call repeatedly.
   */
  async reconcileConnector(soClient: SavedObjectsClientContract): Promise<void> {
    // Gated like every request, so disabling the app also withdraws the connector rather than
    // leaving one that can only fail.
    const available = await this.getRelayClient();
    const connection = available ? await this.readConnection(soClient) : undefined;
    const desiredTenantKey =
      connection?.status === RELAY_APP_CONNECTION_STATUS.connected
        ? connection.tenantKey ?? undefined
        : undefined;

    if (desiredTenantKey === this.getRegisteredTenantKey()) {
      return;
    }
    if (!desiredTenantKey) {
      this.withdrawConnector();
      return;
    }
    this.publishConnector(desiredTenantKey);
  }

  private async readConnection(
    soClient: SavedObjectsClientContract
  ): Promise<RelayAppConnectionAttributes | undefined> {
    try {
      const so = await soClient.get<RelayAppConnectionAttributes>(
        RELAY_APP_CONNECTION_SO_TYPE,
        RELAY_APP_CONNECTION_SO_ID
      );
      return so.attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async writeConnection(
    soClient: SavedObjectsClientContract,
    attributes: Omit<RelayAppConnectionAttributes, 'updatedAt'>
  ): Promise<void> {
    await soClient.create<RelayAppConnectionAttributes>(
      RELAY_APP_CONNECTION_SO_TYPE,
      { ...attributes, updatedAt: new Date().toISOString() },
      { id: RELAY_APP_CONNECTION_SO_ID, overwrite: true }
    );
  }

  /** Best-effort key invalidation: never blocks the caller, only logs on failure. */
  private async invalidateApiKey(apiKeyId: string, context: string): Promise<void> {
    await this.server.security.authc.apiKeys
      .invalidateAsInternalUser({ ids: [apiKeyId] })
      .catch((error) => {
        this.logger.warn(`Failed to invalidate API key ${apiKeyId} ${context}: ${error.message}`);
      });
  }

  private async revokeServiceAccount(
    request: KibanaRequest,
    serviceAccountId: string,
    context: string
  ): Promise<void> {
    await this.server.core.security.serviceAccounts
      .delete(request, serviceAccountId)
      .catch((error) => {
        this.logger.warn(
          `Failed to revoke service account ${serviceAccountId} ${context}: ${error.message}`
        );
      });
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof RelayRequestError) {
      return error.relayMessage ?? error.message;
    }
    if (error instanceof Error && error.cause instanceof Error) {
      return `${error.message} cause: ${error.cause.message}`;
    }
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Relay posts every turn to `kibana_url`, which has no space prefix, so turns run in the default
   * space whatever space Connect was clicked from. Agent Builder accepts an unknown agent id and
   * only fails the run, so the agent is declared only when it exists and is available, checked with the minted key
   * because that is the credential Relay presents.
   */
  private async resolveSlackAgentId(encodedApiKey: string): Promise<string | undefined> {
    const { agentBuilder } = this.server;
    if (!agentBuilder) {
      return undefined;
    }
    const request = kibanaRequestFactory({
      headers: { authorization: `ApiKey ${encodedApiKey}` },
      path: '/',
      spaceId: DEFAULT_SPACE_ID,
    });
    try {
      const registry = await agentBuilder.agents.getRegistry({ request });
      // `get` rather than `has`: only `get` runs the agent's availability gate, which rejects runs
      // the same way Relay's turns would be rejected.
      await registry.get(NIGHTSHIFT_INVESTIGATION_AGENT_ID);
      return NIGHTSHIFT_INVESTIGATION_AGENT_ID;
    } catch (error) {
      if (isAgentNotFoundError(error) || isAgentUnavailableError(error)) {
        this.logger.debug(
          `${NIGHTSHIFT_INVESTIGATION_AGENT_ID} is not installed in the default space, Slack turns will use the default agent`
        );
        return undefined;
      }
      this.logger.warn(
        `Failed to look up ${NIGHTSHIFT_INVESTIGATION_AGENT_ID}, Slack turns will use the default agent: ${this.toErrorMessage(
          error
        )}`
      );
    }
    return undefined;
  }

  async connect(request: KibanaRequest): Promise<SlackAppConnectResponse> {
    const relayClient = await this.getRelayClient();
    if (!relayClient) {
      throw new SlackAppUnavailableError(
        'The Elastic Slack App is not available on this deployment'
      );
    }

    const soClient = this.getSoClient(request);
    const now = new Date().toISOString();

    // A prior connection (connected, or a still-in-progress install) may already
    // hold a live managed key. It's invalidated only once the new install
    // succeeds (below), not here — invalidating it up front would brick a
    // working connection if startInstall then failed, since the SO write also
    // only happens on success.
    const existingConnection = await this.readConnection(soClient);

    // M2: a UIAM service-account id, and only that. The flag is Serverless-only
    // and default-off, so ECH and flag-off installs stay on the API key below.
    if (relayClient.uiamEnabled) {
      return this.connectWithServiceAccount(
        request,
        relayClient,
        soClient,
        existingConnection,
        now
      );
    }

    // Mint a managed, read-only, least-privilege ES API key for the agent. The key
    // is granted on behalf of the connecting user but survives their deletion (ES keys
    // outlive their owner). Because the grant intersects with the owner's privileges, the
    // connecting user must themselves hold every privilege below or the key is silently
    // under-privileged.
    //
    // - Observability signals get direct ES read: the obs agent tools query them as this key
    //   (asCurrentUser). Broad conventional patterns cover APM/OTel logs, metrics and traces
    //   without regenerating the key when new data is onboarded.
    // - Nightshift data is reached through the `nightshift` Kibana feature (read includes
    //   every engine via includeIn), Streams data through `streams` (read), and
    //   connectors/LLM through `actions` (read). Those go via the internal Kibana client,
    //   so no grants on system/dot indices (unsupported in serverless) are needed.
    const apiKeyResult = await this.server.security.authc.apiKeys.grantAsInternalUser(request, {
      name: 'nightshift-relay-agent-builder',
      metadata: { managed: true, managed_by: 'nightshift-relay', type: 'agent_builder_converse' },
      kibana_role_descriptors: {
        nightshift_relay_agent_builder: {
          elasticsearch: {
            cluster: ['monitor_inference'],
            indices: [
              {
                names: ['traces-*', 'logs-*', 'metrics-*', 'apm-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
            run_as: [],
          },
          kibana: [
            {
              spaces: ['*'],
              feature: {
                nightshift: ['read'],
                streams: ['read'],
                agentBuilder: ['read'],
                actions: ['read'],
                workflowsManagement: ['read'],
              },
            },
          ],
        },
      },
    });

    if (!apiKeyResult) {
      throw new Error('Unable to create an API key (API keys are disabled)');
    }

    const encodedApiKey = Buffer.from(`${apiKeyResult.id}:${apiKeyResult.api_key}`).toString(
      'base64'
    );

    const username = this.server.security.authc.getCurrentUser(request)?.username;

    // Falls back to 'basic' in the (practically unreachable) case where no
    // license doc exists on the cluster at all, so the required field always
    // has a valid LicenseType value.
    const license = await this.server.licensing.getLicense();

    const agentId = await this.resolveSlackAgentId(encodedApiKey);

    // The key is the caller-supplied `kibana_api_key` (relay-service#78): the Relay
    // stores it encrypted against the binding and presents it to Agent Builder. It is
    // never returned by any Relay endpoint, so Kibana stores no secret at all.
    let installResponse;
    try {
      installResponse = await relayClient.startInstall({
        kibana_api_key: encodedApiKey,
        kibana_url: getKibanaUrl(this.server.core, this.server.cloud),
        kibana_version: this.server.kibanaVersion,
        license_info: license.type ?? 'basic',
        ...(username ? { created_by_user_key: username } : {}),
        ...(agentId ? { agent_id: agentId } : {}),
      });
    } catch (error) {
      this.logger.error(`Slack app install failed: ${this.toErrorMessage(error)}`);
      // Do not leak an orphaned key if the Relay never took ownership of it.
      await this.invalidateApiKey(apiKeyResult.id, 'after Relay install error');
      throw error;
    }

    if (existingConnection?.apiKeyId) {
      await this.invalidateApiKey(existingConnection.apiKeyId, 'after successful reconnect');
    }

    await this.writeConnection(soClient, {
      status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
      apiKeyId: apiKeyResult.id,
      claimId: installResponse.claim_id,
      tenantKey: null,
      surface: 'slack',
      createdBy: username,
      createdAt: now,
    });

    // The install may land on a different workspace, so any leftover connector now carries a stale
    // tenant key. Republished once the claim completes.
    this.withdrawConnector();

    return { authorizeUrl: installResponse.authorize_url };
  }

  private async connectWithServiceAccount(
    request: KibanaRequest,
    relayClient: RelayClientContract,
    soClient: SavedObjectsClientContract,
    existingConnection: RelayAppConnectionAttributes | undefined,
    now: string
  ): Promise<SlackAppConnectResponse> {
    if (!this.server.isServerless) {
      throw new SlackAppUnavailableError(
        'Relay UIAM install is not supported on this distribution. `xpack.actions.relay.uiam.enabled` is Serverless-only.'
      );
    }

    const serviceAccounts = this.server.core.security.serviceAccounts;

    if (!serviceAccounts.isEnabled()) {
      throw new SlackAppUnavailableError(
        'Relay UIAM install requires UIAM service accounts. Enable `xpack.security.serviceAccounts` and configure `xpack.security.uiam`.'
      );
    }

    const username = this.server.security.authc.getCurrentUser(request)?.username;
    const license = await this.server.licensing.getLicense();

    const { id: serviceAccountId } = await serviceAccounts.create(request, {
      name: `${RELAY_SERVICE_ACCOUNT_NAME_PREFIX}-${randomUUID()}`, // Add an uuid as name could collide even after a deletion
      roles: RELAY_SERVICE_ACCOUNT_ROLES,
      trustedPlatformAssumers: RELAY_PLATFORM_ASSUMERS,
    });

    let installResponse;
    try {
      installResponse = await relayClient.startInstall({
        uiam_service_account_id: serviceAccountId,
        kibana_url: getKibanaUrl(this.server.core, this.server.cloud),
        kibana_version: this.server.kibanaVersion,
        license_info: license.type ?? 'basic',
        ...(username ? { created_by_user_key: username } : {}),
        // TODO: use resolveSlackAgentId once Relay is space aware
        ...(this.server.agentBuilder ? { agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID } : {}),
      });
    } catch (error) {
      this.logger.error(`Slack app install failed: ${this.toErrorMessage(error)}`);
      await this.revokeServiceAccount(request, serviceAccountId, 'after Relay install error');
      throw error;
    }

    if (existingConnection?.apiKeyId) {
      await this.invalidateApiKey(existingConnection.apiKeyId, 'after successful reconnect');
    }
    if (existingConnection?.serviceAccountId) {
      await this.revokeServiceAccount(
        request,
        existingConnection.serviceAccountId,
        'after successful reconnect'
      );
    }

    await this.writeConnection(soClient, {
      status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
      apiKeyId: null,
      serviceAccountId,
      claimId: installResponse.claim_id,
      tenantKey: null,
      surface: 'slack',
      createdBy: username,
      createdAt: now,
    });

    this.withdrawConnector();

    return { authorizeUrl: installResponse.authorize_url };
  }

  private async failInProgressInstall(
    soClient: SavedObjectsClientContract,
    connection: RelayAppConnectionAttributes,
    error: RelayRequestError
  ): Promise<SlackAppStatusResponse> {
    if (connection.apiKeyId) {
      await this.invalidateApiKey(connection.apiKeyId, 'after install failure');
    }

    const message = this.toErrorMessage(error);
    this.logger.warn(`Slack app install failed terminally: ${message}`);
    await this.writeConnection(soClient, {
      ...connection,
      status: RELAY_APP_CONNECTION_STATUS.error,
      apiKeyId: null,
      error: message,
    });
    this.withdrawConnector();

    return { available: true, status: RELAY_APP_CONNECTION_STATUS.error, error: message };
  }

  async getStatus(request: KibanaRequest): Promise<SlackAppStatusResponse> {
    const soClient = this.getSoClient(request);
    const [relayClient, connection] = await Promise.all([
      this.getRelayClient(),
      this.readConnection(soClient),
    ]);

    if (!relayClient) {
      return { available: false, status: RELAY_APP_CONNECTION_STATUS.notConnected };
    }

    if (!connection) {
      return { available: true, status: RELAY_APP_CONNECTION_STATUS.notConnected };
    }

    if (connection.status === RELAY_APP_CONNECTION_STATUS.oauthInProgress) {
      if (!connection.claimId) {
        return this.failInProgressInstall(
          soClient,
          connection,
          new RelayRequestError('/v1/slack/install/claim', 400, 'missing claim id')
        );
      }
      try {
        const claim = await relayClient.fetchClaim(connection.claimId);
        if (claim.status === 'complete') {
          if (!claim.tenant_key) {
            return this.failInProgressInstall(
              soClient,
              connection,
              new RelayRequestError(
                '/v1/slack/install/claim',
                502,
                'completed claim has no tenant key'
              )
            );
          }
          await this.writeConnection(soClient, {
            ...connection,
            tenantKey: claim.tenant_key,
            status: RELAY_APP_CONNECTION_STATUS.connected,
          });
          this.publishConnector(claim.tenant_key);
          return { available: true, status: RELAY_APP_CONNECTION_STATUS.connected };
        }
      } catch (error) {
        if (error instanceof RelayRequestError && error.isTerminal) {
          return this.failInProgressInstall(soClient, connection, error);
        }
        this.logger.warn(`Failed to poll Relay install claim: ${this.toErrorMessage(error)}`);
      }
    }

    return {
      available: true,
      status: connection.status,
      ...(connection.error ? { error: connection.error } : {}),
    };
  }

  async listBindings(
    request: KibanaRequest,
    options: ListBindingsOptions = {}
  ): Promise<SlackAppBindingsResponse> {
    const soClient = this.getSoClient(request);
    const [relayClient, connection] = await Promise.all([
      this.getRelayClient(),
      this.readConnection(soClient),
    ]);

    if (!relayClient) {
      return { bindings: [] };
    }

    if (connection?.status !== RELAY_APP_CONNECTION_STATUS.connected || !connection.tenantKey) {
      return { bindings: [] };
    }

    let page;
    try {
      page = await relayClient.listBindings(connection.tenantKey, {
        cursor: options.cursor,
        limit: options.perPage,
      });
    } catch (error) {
      this.logger.warn(`Failed to list bindings from Relay: ${this.toErrorMessage(error)}`);
      throw error;
    }

    // The Relay returns only this deployment's own SUB bindings (the connected channels),
    // each carrying its persisted display snapshot, so no additional Slack call is needed.
    const bindings: SlackAppBindingsResponse['bindings'] = [];
    for (const entry of page.bindings) {
      if (entry.scope_id == null) {
        continue;
      }
      const binding: SlackAppBindingsResponse['bindings'][number] = {
        channel: entry.scope_id,
        status: 'bound_to_self',
      };
      if (entry.display_name != null) {
        binding.displayName = entry.display_name;
      }
      bindings.push(binding);
    }

    return { bindings, nextCursor: page.nextCursor };
  }

  private async requireConnectedTenant(
    request: KibanaRequest
  ): Promise<{ relayClient: RelayClientContract; tenantKey: string }> {
    const soClient = this.getSoClient(request);
    const [relayClient, connection] = await Promise.all([
      this.getRelayClient(),
      this.readConnection(soClient),
    ]);
    if (!relayClient) {
      throw new SlackAppUnavailableError(
        'The Elastic Slack App is not available on this deployment'
      );
    }
    if (connection?.status !== RELAY_APP_CONNECTION_STATUS.connected || !connection.tenantKey) {
      throw new SlackAppUnavailableError('Connection is not in a connected state');
    }
    return { relayClient, tenantKey: connection.tenantKey };
  }

  async bindChannel(request: KibanaRequest, channelId: string): Promise<void> {
    const { relayClient, tenantKey } = await this.requireConnectedTenant(request);
    await relayClient.bind(tenantKey, channelId);
  }

  async unbindChannel(request: KibanaRequest, channelId: string): Promise<void> {
    const { relayClient, tenantKey } = await this.requireConnectedTenant(request);
    await relayClient.unbindChannel(tenantKey, channelId);
  }

  async disconnect(request: KibanaRequest): Promise<SlackAppDisconnectResponse> {
    const soClient = this.getSoClient(request);
    const [relayClient, connection] = await Promise.all([
      this.getRelayClient(),
      this.readConnection(soClient),
    ]);

    if (!connection) {
      return { status: 'disconnected' };
    }

    // Up front, not on the success path: a failed unbind below leaves the connection in `error` for
    // the user to retry, and rules must not keep posting through a connection being torn down.
    this.withdrawConnector();

    if (connection.apiKeyId) {
      await this.invalidateApiKey(connection.apiKeyId, 'on disconnect');
    }
    if (connection.serviceAccountId) {
      await this.revokeServiceAccount(request, connection.serviceAccountId, 'on disconnect');
    }

    if (relayClient && connection.tenantKey) {
      try {
        await relayClient.unbind(connection.tenantKey);
      } catch (error) {
        const message = this.toErrorMessage(error);
        this.logger.warn(`Failed to unbind from Relay on disconnect: ${message}`);
        await this.writeConnection(soClient, {
          ...connection,
          status: RELAY_APP_CONNECTION_STATUS.error,
          apiKeyId: null,
          serviceAccountId: null,
          error: message,
        });
        throw error;
      }
    }

    const { error: _staleError, ...retainedConnection } = connection;
    await this.writeConnection(soClient, {
      ...retainedConnection,
      status: RELAY_APP_CONNECTION_STATUS.notConnected,
      apiKeyId: null,
      serviceAccountId: null,
      tenantKey: null,
    });

    return { status: 'disconnected' };
  }
}
