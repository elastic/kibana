/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { ElasticsearchClient, Logger, SavedObject } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import pMap from 'p-map';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import pRetry from 'p-retry';
import { chunk, isEmpty, once } from 'lodash';
import { registerCleanUpTask } from '../tasks/clean_up_package_policies_task';
import type { SyntheticsServerSetup } from '../types';
import { sendErrorTelemetryEvents } from '../routes/telemetry/monitor_upgrade_sender';
import { installSyntheticsIndexTemplates } from '../routes/synthetics_service/install_index_templates';
import {
  getAPIKeyForSyntheticsService,
  getApiKeyInvalidTelemetryPayload,
  type ApiKeyInvalidReason,
} from './get_api_key';
import { getEsHosts } from './get_es_hosts';
import { getSyntheticsParams } from './get_synthetics_params';
import { registerMonitorSyncTask, scheduleMonitorSyncTask } from './monitor_sync_task';
import { readDecryptedMonitors, retainUnchangedMonitors } from './retain_unchanged_monitors';
import { getMaintenanceWindows } from './maintenance_windows/get_maintenance_windows';
import type { ServiceConfig } from '../config';
import type { ServiceData } from './synthetics_service_http_client';
import { SyntheticsServiceHttpClient } from './synthetics_service_http_client';
import type { MonitorSyncState } from './incremental_sync';
import {
  getChangedMonitorsFilter,
  getChangedSince,
  getParamsVersion,
  getSyncFingerprint,
  needsFullSync,
} from './incremental_sync';

import { syntheticsMonitorSOTypes } from '../../common/types/saved_objects';
import type {
  EncryptedSyntheticsMonitorAttributes,
  MonitorFields,
  ServiceLocationErrors,
  ServiceLocations,
  SyntheticsMonitorWithSecretsAttributes,
  ThrottlingOptions,
} from '../../common/runtime_types';
import { ConfigKey } from '../../common/runtime_types';
import { getServiceLocations } from './get_service_locations';

import type { ConfigData } from './formatters/public_formatters/format_configs';
import {
  formatMonitorConfigs,
  formatMonitorsToDelete,
  formatSavedMonitors,
} from './formatters/public_formatters/format_configs';

// Monitors are sent in full in pages this size, which keeps each payload below the service limit.
const FULL_SYNC_PAGE_SIZE = 250;

/**
 * Kibana's side of the Elastic-managed Synthetics Service: knows its locations and whether the
 * account may use them, pushes monitors to them, and keeps them alive with a periodic sync.
 * Monitors at private locations are handled by `SyntheticsPrivateLocation` instead.
 */
export class ServiceManagedLocations {
  private logger: Logger;
  private esClient?: ElasticsearchClient;
  private readonly server: SyntheticsServerSetup;
  public httpClient: SyntheticsServiceHttpClient;

  private readonly config: ServiceConfig;
  private readonly esHosts: string[];

  public locations: ServiceLocations;
  public throttling: ThrottlingOptions | undefined;

  public indexTemplateExists?: boolean;
  private indexTemplateInstalling?: boolean;

  public isAllowed: boolean;
  public signupUrl: string | null;

  public syncErrors?: ServiceLocationErrors | null = [];

  public invalidApiKeyError?: boolean;

  constructor(server: SyntheticsServerSetup) {
    this.logger = server.logger;
    this.server = server;
    this.config = server.config.service ?? {};

    // set isAllowed to false if manifestUrl is not set
    this.isAllowed = this.config.manifestUrl ? false : true;
    this.signupUrl = null;

    this.httpClient = new SyntheticsServiceHttpClient(server.logger, this.config, this.server);
    this.esHosts = getEsHosts({ config: this.config, cloud: server.cloud });

    this.locations = [];
  }

  public async setup(taskManager: TaskManagerSetupContract) {
    registerMonitorSyncTask({
      taskManager,
      server: this.server,
      syncInterval: this.config.syncInterval,
      runSync: (state) => this.runScheduledSync(state),
    });
    registerCleanUpTask(taskManager, this.server);

    await this.refreshLocations();

    const { allowed, signupUrl } = await this.httpClient.checkAccountAccessStatus();
    this.isAllowed = allowed;
    this.signupUrl = signupUrl;
  }

  public start(taskManager: TaskManagerStartContract) {
    if (this.config?.manifestUrl) {
      void scheduleMonitorSyncTask({
        taskManager,
        server: this.server,
        syncInterval: this.config.syncInterval,
      });
    } else {
      const logLevel = this.shouldLogAsError() ? 'error' : 'debug';
      const message =
        'Synthetics sync task is not being scheduled because manifestUrl is not configured.';
      this.logger[logLevel](message);
    }
    void this.setupIndexTemplates();
  }

  private shouldLogAsError(): boolean {
    const cloud = this.server.cloud;
    if (!cloud) {
      return false; // Self-managed, use DEBUG
    }
    // Serverless deployments should log as ERROR
    if (cloud.isServerlessEnabled) {
      return true;
    }
    // ECH (stateful) deployments have deploymentId, should log as ERROR
    if (cloud.isCloudEnabled && cloud.deploymentId) {
      return true;
    }
    // ECE or self-managed, use DEBUG
    return false;
  }

  public async setupIndexTemplates() {
    if (process.env.CI && !this.config?.manifestUrl) {
      // skip installation on CI
      return;
    }
    if (this.indexTemplateExists) {
      // if already installed, don't need to reinstall
      return;
    }
    try {
      if (!this.indexTemplateInstalling) {
        this.indexTemplateInstalling = true;

        const installedPackage = await pRetry(() => installSyntheticsIndexTemplates(this.server), {
          retries: 3,
          minTimeout: 3000,
          factor: 2,
          onFailedAttempt: (error) => {
            this.logger.debug(
              `Attempt ${error.attemptNumber} to install synthetics index templates failed. ` +
                `${error.retriesLeft} retries remaining.`
            );
          },
        });
        this.indexTemplateInstalling = false;
        if (
          installedPackage.name === 'synthetics' &&
          installedPackage.install_status === 'installed'
        ) {
          this.logger.debug('Installed synthetics index templates');
          this.indexTemplateExists = true;
        } else if (
          installedPackage.name === 'synthetics' &&
          installedPackage.install_status === 'install_failed'
        ) {
          const e = new IndexTemplateInstallationError();
          this.logger.error(e.message, { error: e });
          this.indexTemplateExists = false;
        }
      }
    } catch (e) {
      this.logger.error(new IndexTemplateInstallationError().message, { error: e });
      this.indexTemplateInstalling = false;
    }
  }

  public async refreshLocations() {
    const service = this;

    try {
      const result = await getServiceLocations(service.server);
      service.throttling = result.throttling;
      service.locations = result.locations;
      service.httpClient.locations = result.locations;
      this.logger.debug(
        `Fetched ${service.locations
          .map((loc) => loc.id)
          .join(',')} Synthetics service locations from manifest: ${this.config.manifestUrl}`
      );
    } catch (error) {
      this.logger.error(`Error registering service locations, Error: ${error.message}`, { error });
    }
  }

  /**
   * One run of the periodic sync: refreshes the locations and the account's access to them, then
   * pushes the monitors once the index templates are in place.
   */
  public async runScheduledSync(state: MonitorSyncState) {
    await this.refreshLocations();

    const { allowed, signupUrl } = await this.httpClient.checkAccountAccessStatus();
    this.isAllowed = allowed;
    this.signupUrl = signupUrl;

    if (this.isAllowed && this.config.manifestUrl) {
      await this.setupIndexTemplates();
      if (this.indexTemplateExists) {
        await this.syncAllMonitors(ALL_SPACES_ID, state);
      } else {
        this.logger.warn('Skipping monitor push — synthetics index templates not yet installed.');
      }
    } else {
      if (!this.isAllowed) {
        this.logger.debug('User is not allowed to access Synthetics service.');
      }
    }
  }

  private async getLicense() {
    this.esClient = this.getESClient();
    let license;
    if (this.esClient === undefined || this.esClient === null) {
      throw Error(
        'Cannot sync monitors with the Synthetics service. Elasticsearch client is unavailable: cannot retrieve license information'
      );
    }
    try {
      license = (await this.esClient.license.get())?.license;
    } catch (e) {
      throw new Error(
        `Cannot sync monitors with the Synthetics service. Unable to determine license level: ${e}`
      );
    }

    if (license?.status === 'expired') {
      throw new Error('Cannot sync monitors with the Synthetics service. License is expired.');
    }

    if (!license?.type) {
      throw new Error(
        'Cannot sync monitors with the Synthetics service. Unable to determine license level.'
      );
    }

    return license;
  }

  private async getSOClientFinder({ pageSize, filter }: { pageSize: number; filter?: string }) {
    const encryptedClient = this.server.encryptedSavedObjects.getClient();

    return await encryptedClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
      {
        type: syntheticsMonitorSOTypes,
        perPage: pageSize,
        namespaces: [ALL_SPACES_ID],
        filter,
      }
    );
  }

  /** Pages through every monitor without decrypting it, reading only what a delete request needs. */
  private getDeleteSOClientFinder({ pageSize }: { pageSize: number }) {
    return this.server.coreStart.savedObjects
      .createInternalRepository()
      .createPointInTimeFinder<EncryptedSyntheticsMonitorAttributes>({
        type: syntheticsMonitorSOTypes,
        perPage: pageSize,
        namespaces: [ALL_SPACES_ID],
        fields: [
          ConfigKey.MONITOR_QUERY_ID,
          ConfigKey.MONITOR_TYPE,
          ConfigKey.LOCATIONS,
          ConfigKey.SCHEDULE,
          ConfigKey.NAMESPACE,
        ],
      });
  }

  private getESClient() {
    if (!this.server.coreStart) {
      return;
    }
    return this.server.coreStart?.elasticsearch.client.asInternalUser;
  }

  async getOutput({ inspect }: { inspect: boolean } = { inspect: false }): Promise<{
    output: ServiceData['output'] | null;
    invalidDetails?: {
      reason: ApiKeyInvalidReason;
      missingPrivileges?: string[];
    };
  }> {
    const { apiKey, isValid, reason, missingPrivileges } = await getAPIKeyForSyntheticsService({
      server: this.server,
    });
    // do not check for api key validity if inspecting
    if (!isValid && !inspect) {
      this.server.logger.debug(
        'API key is not valid. Cannot push monitor configuration to synthetics public testing locations'
      );
      this.invalidApiKeyError = true;
      return {
        output: null,
        invalidDetails: {
          reason: reason ?? 'invalid',
          missingPrivileges,
        },
      };
    }

    return {
      output: {
        hosts: this.esHosts,
        api_key: `${apiKey?.id}:${apiKey?.apiKey}`,
      },
    };
  }

  async inspectMonitor(config: ConfigData | null, mws: MaintenanceWindow[]) {
    if (!config || isEmpty(config)) {
      return null;
    }
    const monitors = formatMonitorConfigs({
      configs: config,
      maintenanceWindows: mws,
      logger: this.logger,
    });
    const license = await this.getLicense();

    const { output } = await this.getOutput({ inspect: true });
    if (output) {
      return await this.httpClient.inspectMonitors({
        monitors,
        output,
        license,
      });
    }
    return null;
  }

  async addMonitors(configs: ConfigData[], mws: MaintenanceWindow[]) {
    try {
      if (configs.length === 0 || !this.isAllowed) {
        return;
      }

      const monitors = formatMonitorConfigs({
        configs,
        maintenanceWindows: mws,
        logger: this.logger,
      });
      const license = await this.getLicense();

      const { output } = await this.getOutput();
      if (output) {
        this.logger.debug(`1 monitor will be pushed to synthetics service.`);

        this.httpClient
          .addMonitors({
            monitors,
            output,
            license,
          })
          .then((res) => {
            this.syncErrors = res;
          })
          .catch((e) => {
            this.logger.error(e);
          });
      }
      return this.syncErrors;
    } catch (e) {
      this.logger.error(e);
    }
  }

  async editMonitors(monitorConfig: ConfigData[], isEdit = true, mws: MaintenanceWindow[]) {
    try {
      if (monitorConfig.length === 0 || !this.isAllowed) {
        return;
      }
      const license = await this.getLicense();
      const monitors = formatMonitorConfigs({
        configs: monitorConfig,
        maintenanceWindows: mws,
        logger: this.logger,
      });

      const { output } = await this.getOutput();
      if (output) {
        const data = {
          monitors,
          output,
          isEdit,
          license,
        };

        this.syncErrors = await this.httpClient.editMonitors(data);
      }
      return this.syncErrors;
    } catch (e) {
      this.logger.error(e);
    }
  }

  /**
   * Pushes every saved monitor to the service locations that run them.
   *
   * When `syncState` carries the outcome of a previous run, monitors that were not edited since are
   * only kept alive by id, which spares reading, decrypting and sending their configuration. Any
   * monitor the service no longer holds is sent in full instead. Without `syncState` every monitor
   * is sent in full. On success the state is updated for the next run.
   */
  async syncAllMonitors(spaceId: string, syncState?: MonitorSyncState) {
    const license = await this.getLicense();
    const service = this;

    service.syncErrors = [];

    const startedAt = new Date();
    let hasPushFailure = false;
    // Kept apart from `syncErrors`, which add and edit requests also write to while this runs.
    const pushErrors: ServiceLocationErrors = [];

    const maintenanceWindows = await getMaintenanceWindows(this.server, spaceId);

    // Read before any monitor, so an edit made while this run is in progress is not recorded
    // as synced and gets picked up by the next run.
    const soClient = syncState
      ? this.server.coreStart.savedObjects.createInternalRepository()
      : undefined;
    const paramsVersion = soClient ? await getParamsVersion(soClient) : '';

    // Looked up the first time a monitor needs it, so nothing is asked of the API key while
    // there are no monitors. `undefined` until then, `null` when the key is not usable.
    const resolvedOutput: { current?: ServiceData['output'] | null } = {};
    const resolveOutput = async () => {
      if (resolvedOutput.current !== undefined) {
        return resolvedOutput.current;
      }

      const outputResult = await this.getOutput();
      resolvedOutput.current = outputResult.output;
      if (!outputResult.output) {
        const { code, reason, message } = getApiKeyInvalidTelemetryPayload({
          reason: outputResult.invalidDetails?.reason ?? 'invalid',
          missingPrivileges: outputResult.invalidDetails?.missingPrivileges,
        });
        sendErrorTelemetryEvents(service.logger, service.server.telemetry, {
          type: 'invalidApiKey',
          code,
          reason,
          message,
          stackVersion: service.server.stackVersion,
        });
      }
      return outputResult.output;
    };

    const getFingerprint = ({ hosts, api_key: apiKey }: ServiceData['output']) =>
      getSyncFingerprint({
        stackVersion: this.server.stackVersion,
        licenseType: license.type,
        licenseIssuedTo: license.issued_to,
        kibanaUrl: this.server.basePath.publicBaseUrl,
        esHosts: hosts,
        apiKeyId: apiKey.split(':')[0],
        paramsVersion,
        maintenanceWindows: maintenanceWindows.map(({ id, updatedAt }) => ({ id, updatedAt })),
      });

    // Set only when unchanged monitors can be retained instead of sent in full.
    let changedSince: string | undefined;
    if (soClient && syncState?.lastSyncedAt) {
      const { total } = await soClient.find({
        type: syntheticsMonitorSOTypes,
        perPage: 0,
        namespaces: [ALL_SPACES_ID],
      });
      if (total === 0) {
        return;
      }

      const output = await resolveOutput();
      if (!output) {
        return;
      }

      // Reading the monitors one by one is only worth it for the few a service lets go of. A
      // location that cannot retain lets go of all of its monitors on every run, so as long as
      // there is one, scanning them all in pages is cheaper.
      const canRetain = this.locations.every(({ id }) => this.httpClient.supportsRetain(id));
      const fingerprint = getFingerprint(output);
      if (
        canRetain &&
        !needsFullSync({ state: syncState, fingerprint, now: startedAt.getTime() })
      ) {
        changedSince = getChangedSince(syncState.lastSyncedAt);
      }
    }

    const getParams = once(() => getSyntheticsParams(this.server));
    if (!changedSince) {
      await getParams();
    }

    const bucketsByLocation: Record<string, MonitorFields[]> = {};
    this.locations.forEach((location) => {
      bucketsByLocation[location.id] = [];
    });

    const syncAllLocations = async (perBucket = 0) => {
      await pMap(
        this.locations,
        async (location) => {
          if (bucketsByLocation[location.id].length <= perBucket) {
            return;
          }
          const output = await resolveOutput();
          if (!output) {
            return;
          }

          const locMonitors = bucketsByLocation[location.id].splice(0, FULL_SYNC_PAGE_SIZE);

          this.logger.debug(
            `${locMonitors.length} monitors will be pushed to synthetics service for location ${location.id}.`
          );

          const syncErrors = await this.httpClient.syncMonitors({
            monitors: locMonitors,
            output,
            license,
            location,
          });

          if (!syncErrors) {
            hasPushFailure = true;
          }
          pushErrors.push(...(syncErrors ?? []));
          this.syncErrors = [...(this.syncErrors ?? []), ...(syncErrors ?? [])];
        },
        {
          stopOnError: false,
        }
      );
    };

    const pushMonitors = async (
      monitors: Array<SavedObject<SyntheticsMonitorWithSecretsAttributes>>
    ) => {
      try {
        const formattedConfigs = formatSavedMonitors({
          monitors,
          paramsBySpace: await getParams(),
          maintenanceWindows,
          kibanaUrl: this.server.basePath.publicBaseUrl ?? undefined,
          logger: this.logger,
        });

        this.logger.debug(
          `${formattedConfigs.length} monitors will be pushed to synthetics service.`
        );

        formattedConfigs.forEach((monitor) => {
          monitor.locations.forEach((location) => {
            if (location.isServiceManaged) {
              bucketsByLocation[location.id]?.push(monitor);
            }
          });
        });

        await syncAllLocations(FULL_SYNC_PAGE_SIZE);
      } catch (error) {
        hasPushFailure = true;
        this.logger.error(`Failed to run Synthetics sync task, Error: ${error.message}`, {
          error,
        });

        sendErrorTelemetryEvents(service.logger, service.server.telemetry, {
          reason: 'Failed to push configs to service',
          message: error?.message,
          type: 'pushConfigsError',
          code: error?.code,
          status: error.status,
          stackVersion: service.server.stackVersion,
        });
      }
    };

    // Unchanged monitors the service no longer holds, to be sent in full below.
    const notRetained =
      soClient && changedSince && resolvedOutput.current
        ? await retainUnchangedMonitors({
            soClient,
            changedSince,
            output: resolvedOutput.current,
            license,
            httpClient: this.httpClient,
            locations: this.locations,
            logger: this.logger,
          })
        : [];

    const finder = await this.getSOClientFinder({
      pageSize: FULL_SYNC_PAGE_SIZE,
      filter: changedSince ? getChangedMonitorsFilter(changedSince) : undefined,
    });

    for await (const result of finder.find()) {
      if (result.saved_objects.length > 0) {
        if (!(await resolveOutput())) {
          finder.close().catch(() => {});
          return;
        }

        const readable = result.saved_objects.filter(({ error }) => !error);
        if (readable.length < result.saved_objects.length) {
          // Not sending a monitor that failed to decrypt must not count as syncing it, or it would
          // not be tried again until the next full sync once it can be read.
          hasPushFailure = true;
          this.logger.warn(
            `${
              result.saved_objects.length - readable.length
            } monitors could not be read and were not synced`
          );
        }
        await pushMonitors(readable);
      }
    }
    finder.close().catch(() => {});

    for (const candidates of chunk(notRetained, FULL_SYNC_PAGE_SIZE)) {
      const { monitors, unreadable } = await readDecryptedMonitors({
        encryptedClient: this.server.encryptedSavedObjects.getClient(),
        monitors: candidates,
        logger: this.logger,
      });
      if (unreadable > 0) {
        hasPushFailure = true;
      }
      if (monitors.length > 0) {
        await pushMonitors(monitors);
      }
    }

    // execute the remaining monitors
    await syncAllLocations();

    const { current: output } = resolvedOutput;
    // With no locations nothing was sent, so there is nothing to record: the locations could not
    // be fetched, and changes made meanwhile must still count as changed once they are back.
    const hasLocations = this.locations.length > 0;
    if (syncState && output && hasLocations && !hasPushFailure && pushErrors.length === 0) {
      const syncedAt = startedAt.toISOString();
      syncState.lastSyncedAt = syncedAt;
      syncState.syncFingerprint = getFingerprint(output);
      if (!changedSince) {
        syncState.lastFullSyncAt = syncedAt;
      }
    }
  }

  async runMonitorOnce(configs?: ConfigData) {
    if (!configs) {
      return;
    }
    const monitors = formatMonitorConfigs({
      configs,
      maintenanceWindows: [],
      logger: this.logger,
    });
    if (monitors.length === 0) {
      return;
    }
    const license = await this.getLicense();

    const { output } = await this.getOutput();
    if (!output) {
      return;
    }

    try {
      return await this.httpClient.runOnce({
        monitors,
        output,
        license,
      });
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async deleteMonitors(configs: ConfigData[]) {
    try {
      if (configs.length === 0) {
        return;
      }
      const license = await this.getLicense();
      const hasPublicLocations = configs.some((config) =>
        config.monitor.locations.some(({ isServiceManaged }) => isServiceManaged)
      );

      if (hasPublicLocations) {
        const { output } = await this.getOutput();
        if (!output) {
          return;
        }

        const data = {
          output,
          monitors: formatMonitorsToDelete({ configs, logger: this.logger }),
          license,
        };
        return await this.httpClient.deleteMonitors(data);
      }
    } catch (e) {
      this.server.logger.error(e);
    }
  }

  async deleteAllMonitors() {
    const license = await this.getLicense();
    const finder = this.getDeleteSOClientFinder({ pageSize: 100 });
    const { output } = await this.getOutput();
    if (!output) {
      return;
    }

    const pushErrors: ServiceLocationErrors = [];
    for await (const result of finder.find()) {
      const monitors = formatMonitorsToDelete({
        configs: result.saved_objects.map(({ attributes }) => ({ monitor: attributes })),
        logger: this.logger,
      });
      const hasPublicLocations = monitors.some((config) =>
        config.locations?.some(({ isServiceManaged }) => isServiceManaged)
      );

      if (hasPublicLocations) {
        const data = {
          output,
          monitors,
          license,
        };
        pushErrors.push(...(await this.httpClient.deleteMonitors(data)));
      }
    }

    finder.close().catch(() => {});
    return pushErrors;
  }
}

class IndexTemplateInstallationError extends Error {
  constructor() {
    super();
    this.message = 'Failed to install synthetics index templates.';
    this.name = 'IndexTemplateInstallationError';
  }
}
