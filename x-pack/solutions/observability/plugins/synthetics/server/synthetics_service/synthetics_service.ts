/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type {
  ElasticsearchClient,
  ISavedObjectsRepository,
  KibanaRequest,
  Logger,
  SavedObject,
} from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import pMap from 'p-map';
import moment from 'moment';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import pRetry from 'p-retry';
import { chunk, isEmpty, once } from 'lodash';
import { registerCleanUpTask } from '../tasks/clean_up_package_policies_task';
import type { SyntheticsServerSetup } from '../types';
import { syntheticsParamType } from '../../common/types/saved_objects';
import { sendErrorTelemetryEvents } from '../routes/telemetry/monitor_upgrade_sender';
import { installSyntheticsIndexTemplates } from '../routes/synthetics_service/install_index_templates';
import {
  getAPIKeyForSyntheticsService,
  getApiKeyInvalidTelemetryPayload,
  type ApiKeyInvalidReason,
} from './get_api_key';
import { getEsHosts } from './get_es_hosts';
import type { ServiceConfig } from '../config';
import type { RetainedMonitor, ServiceData } from './service_api_client';
import { ServiceAPIClient } from './service_api_client';
import type { MonitorSyncState } from './retain_sync';
import {
  MONITOR_SAVED_OBJECT_TYPES,
  getChangedMonitorsFilter,
  getChangedSince,
  getParamsVersion,
  getSyncFingerprint,
  getUnchangedMonitorsFilter,
  shouldSyncAllMonitors,
} from './retain_sync';

import type {
  MonitorFields,
  ServiceLocation,
  ServiceLocationErrors,
  ServiceLocations,
  SyntheticsMonitorWithSecretsAttributes,
  SyntheticsParams,
  ThrottlingOptions,
} from '../../common/runtime_types';
import { ConfigKey } from '../../common/runtime_types';
import { getServiceLocations } from './get_service_locations';

import { normalizeSecrets } from './utils/secrets';
import type { ConfigData } from './formatters/public_formatters/format_configs';
import {
  formatHeartbeatRequest,
  formatMonitorConfigFields,
  mixParamsWithGlobalParams,
} from './formatters/public_formatters/format_configs';

const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE =
  'UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects';
const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID = 'UPTIME:SyntheticsService:sync-task';
const SYNTHETICS_SERVICE_SYNC_INTERVAL_DEFAULT = '5m';

// Monitors are sent in full in pages this size, which keeps each payload below the service limit.
const FULL_SYNC_PAGE_SIZE = 250;
// A retained monitor is just an id and a type, so far more fit in one request.
const RETAIN_PAGE_SIZE = 1000;
const FETCH_MONITOR_CONCURRENCY = 10;

type RetainableMonitorAttributes = Pick<
  MonitorFields,
  ConfigKey.MONITOR_QUERY_ID | ConfigKey.MONITOR_TYPE | ConfigKey.ENABLED | ConfigKey.LOCATIONS
>;

interface RetainCandidate extends RetainedMonitor {
  savedObjectId: string;
  savedObjectType: string;
  namespace?: string;
}

export class SyntheticsService {
  private logger: Logger;
  private esClient?: ElasticsearchClient;
  private readonly server: SyntheticsServerSetup;
  public apiClient: ServiceAPIClient;

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

    this.apiClient = new ServiceAPIClient(server.logger, this.config, this.server);
    this.esHosts = getEsHosts({ config: this.config, cloud: server.cloud });

    this.locations = [];
  }

  public async setup(taskManager: TaskManagerSetupContract) {
    this.registerSyncTask(taskManager);
    registerCleanUpTask(taskManager, this.server);

    await this.registerServiceLocations();

    const { allowed, signupUrl } = await this.apiClient.checkAccountAccessStatus();
    this.isAllowed = allowed;
    this.signupUrl = signupUrl;
  }

  public start(taskManager: TaskManagerStartContract) {
    if (this.config?.manifestUrl) {
      void this.scheduleSyncTask(taskManager);
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

  public async registerServiceLocations() {
    const service = this;

    try {
      const result = await getServiceLocations(service.server);
      service.throttling = result.throttling;
      service.locations = result.locations;
      service.apiClient.locations = result.locations;
      this.logger.debug(
        `Fetched ${service.locations
          .map((loc) => loc.id)
          .join(',')} Synthetics service locations from manifest: ${this.config.manifestUrl}`
      );
    } catch (error) {
      this.logger.error(`Error registering service locations, Error: ${error.message}`, { error });
    }
  }

  public registerSyncTask(taskManager: TaskManagerSetupContract) {
    const service = this;
    const interval = this.config.syncInterval ?? SYNTHETICS_SERVICE_SYNC_INTERVAL_DEFAULT;

    taskManager.registerTaskDefinitions({
      [SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE]: {
        title: 'Synthetics Service - Sync Saved Monitors',
        description: 'This task periodically pushes saved monitors to Synthetics Service.',
        timeout: '2m',
        maxAttempts: 3,

        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            // Perform the work of the task. The return value should fit the TaskResult interface.
            async run() {
              const { state } = taskInstance;
              service.logger.debug(`Running synthetics monitors sync task.`);
              service.checkMissingSchedule(state);
              try {
                await service.registerServiceLocations();

                const { allowed, signupUrl } = await service.apiClient.checkAccountAccessStatus();
                service.isAllowed = allowed;
                service.signupUrl = signupUrl;

                if (service.isAllowed && service.config.manifestUrl) {
                  await service.setupIndexTemplates();
                  if (service.indexTemplateExists) {
                    await service.pushConfigs(ALL_SPACES_ID, state);
                  } else {
                    service.logger.warn(
                      'Skipping monitor push — synthetics index templates not yet installed.'
                    );
                  }
                } else {
                  if (!service.isAllowed) {
                    service.logger.debug('User is not allowed to access Synthetics service.');
                  }
                }
              } catch (e) {
                sendErrorTelemetryEvents(service.logger, service.server.telemetry, {
                  reason: 'Failed to run scheduled sync task',
                  message: e?.message,
                  type: 'runTaskError',
                  code: e?.code,
                  status: e.status,
                  stackVersion: service.server.stackVersion,
                });
                service.logger.error(e);
              }

              return { state, schedule: { interval } };
            },
            async cancel() {
              service.logger?.warn(`Task ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID} timed out`);
            },
          };
        },
      },
    });
  }

  public async scheduleSyncTask(
    taskManager: TaskManagerStartContract
  ): Promise<TaskInstance | null> {
    const interval = this.config.syncInterval ?? SYNTHETICS_SERVICE_SYNC_INTERVAL_DEFAULT;

    try {
      const taskInstance = await taskManager.ensureScheduled({
        id: SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID,
        taskType: SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE,
        schedule: {
          interval,
        },
        params: {},
        state: {},
        scope: ['uptime'],
      });

      this.logger?.info(
        `Task ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}.`
      );

      return taskInstance;
    } catch (e) {
      sendErrorTelemetryEvents(this.logger, this.server.telemetry, {
        reason: 'Failed to schedule sync task',
        message: e?.message ?? e,
        type: 'scheduleTaskError',
        code: e?.code,
        status: e.status,
        stackVersion: this.server.stackVersion,
      });

      this.logger?.error(e);

      this.logger?.error(
        `Error running synthetics syncs task: ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID}, ${e?.message}`
      );

      return null;
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
        type: MONITOR_SAVED_OBJECT_TYPES,
        perPage: pageSize,
        namespaces: [ALL_SPACES_ID],
        filter,
      }
    );
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

  async inspectConfig(config: ConfigData | null, mws: MaintenanceWindow[]) {
    if (!config || isEmpty(config)) {
      return null;
    }
    const monitors = this.formatConfigs(config, mws);
    const license = await this.getLicense();

    const { output } = await this.getOutput({ inspect: true });
    if (output) {
      return await this.apiClient.inspect({
        monitors,
        output,
        license,
      });
    }
    return null;
  }

  async addConfigs(configs: ConfigData[], mws: MaintenanceWindow[]) {
    try {
      if (configs.length === 0 || !this.isAllowed) {
        return;
      }

      const monitors = this.formatConfigs(configs, mws);
      const license = await this.getLicense();

      const { output } = await this.getOutput();
      if (output) {
        this.logger.debug(`1 monitor will be pushed to synthetics service.`);

        this.apiClient
          .post({
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

  async editConfig(monitorConfig: ConfigData[], isEdit = true, mws: MaintenanceWindow[]) {
    try {
      if (monitorConfig.length === 0 || !this.isAllowed) {
        return;
      }
      const license = await this.getLicense();
      const monitors = this.formatConfigs(monitorConfig, mws);

      const { output } = await this.getOutput();
      if (output) {
        const data = {
          monitors,
          output,
          isEdit,
          license,
        };

        this.syncErrors = await this.apiClient.put(data);
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
  async pushConfigs(spaceId: string, syncState?: MonitorSyncState) {
    const license = await this.getLicense();
    const service = this;

    service.syncErrors = [];

    const startedAt = new Date();
    let hasPushFailure = false;

    const maintenanceWindows = await this.getMaintenanceWindows(spaceId);

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
        type: MONITOR_SAVED_OBJECT_TYPES,
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

      // Reading the monitors one by one is only worth it for the few a service lets go of, so
      // when no service can retain any, scanning them all is cheaper.
      const canRetain = this.locations.some(({ id }) => this.apiClient.supportsRetain(id));
      const fingerprint = getFingerprint(output);
      if (
        canRetain &&
        !shouldSyncAllMonitors({ state: syncState, fingerprint, now: startedAt.getTime() })
      ) {
        changedSince = getChangedSince(syncState.lastSyncedAt);
      }
    }

    const getParams = once(() => this.getSyntheticsParams());
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

          const syncErrors = await this.apiClient.syncMonitors({
            monitors: locMonitors,
            output,
            license,
            location,
          });

          if (!syncErrors) {
            hasPushFailure = true;
          }
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
        const formattedConfigs = this.normalizeConfigs(
          monitors,
          await getParams(),
          maintenanceWindows
        );

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
      soClient && changedSince
        ? await this.retainUnchangedMonitors({ soClient, changedSince, license, resolveOutput })
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

        await pushMonitors(result.saved_objects.filter(({ error }) => !error));
      }
    }
    finder.close().catch(() => {});

    for (const candidates of chunk(notRetained, FULL_SYNC_PAGE_SIZE)) {
      const monitors = await this.getDecryptedMonitors(candidates);
      if (monitors.length > 0) {
        await pushMonitors(monitors);
      }
    }

    // execute the remaining monitors
    await syncAllLocations();

    const { current: output } = resolvedOutput;
    if (syncState && output && !hasPushFailure && !service.syncErrors?.length) {
      const syncedAt = startedAt.toISOString();
      syncState.lastSyncedAt = syncedAt;
      syncState.syncFingerprint = getFingerprint(output);
      if (!changedSince) {
        syncState.lastFullSyncAt = syncedAt;
      }
    }
  }

  /**
   * Keeps the monitors that were not edited since `changedSince` alive at the service locations
   * that run them, without reading their configuration.
   *
   * @returns the monitors the service could not retain, which have to be sent in full
   */
  private async retainUnchangedMonitors({
    soClient,
    changedSince,
    license,
    resolveOutput,
  }: {
    soClient: ISavedObjectsRepository;
    changedSince: string;
    license: ServiceData['license'];
    resolveOutput: () => Promise<ServiceData['output'] | null>;
  }): Promise<RetainCandidate[]> {
    const output = await resolveOutput();
    if (!output) {
      return [];
    }

    const notRetained = new Map<string, RetainCandidate>();
    const candidatesByLocation = new Map<string, RetainCandidate[]>();
    let retainedCount = 0;

    const retainBatch = async (location: ServiceLocation, candidates: RetainCandidate[]) => {
      let failedIds = new Set(candidates.map(({ id }) => id));
      if (this.apiClient.supportsRetain(location.id)) {
        try {
          failedIds = new Set(
            await this.apiClient.retainMonitors({
              monitors: candidates,
              output,
              license,
              locationId: location.id,
            })
          );
        } catch (error) {
          this.logger.error(`Failed to retain monitors at location ${location.id}`, { error });
        }
      }

      retainedCount += candidates.length - failedIds.size;
      candidates.forEach((candidate) => {
        if (failedIds.has(candidate.id)) {
          notRetained.set(candidate.savedObjectId, candidate);
        }
      });
    };

    const retainAllLocations = async (perBatch = 0) => {
      await pMap(this.locations, async (location) => {
        const candidates = candidatesByLocation.get(location.id) ?? [];
        while (candidates.length > perBatch) {
          await retainBatch(location, candidates.splice(0, RETAIN_PAGE_SIZE));
        }
      });
    };

    const finder = soClient.createPointInTimeFinder<RetainableMonitorAttributes>({
      type: MONITOR_SAVED_OBJECT_TYPES,
      perPage: RETAIN_PAGE_SIZE,
      namespaces: [ALL_SPACES_ID],
      filter: getUnchangedMonitorsFilter(changedSince),
      fields: [
        ConfigKey.MONITOR_QUERY_ID,
        ConfigKey.MONITOR_TYPE,
        ConfigKey.ENABLED,
        ConfigKey.LOCATIONS,
      ],
    });

    for await (const { saved_objects: monitors } of finder.find()) {
      for (const monitor of monitors) {
        const { id, type, enabled, locations } = monitor.attributes;
        const serviceLocations = (locations ?? []).filter(
          ({ isServiceManaged }) => isServiceManaged
        );

        // The service only holds enabled monitors at the locations it runs.
        if (enabled === false || serviceLocations.length === 0) {
          continue;
        }

        const candidate: RetainCandidate = {
          id,
          type,
          savedObjectId: monitor.id,
          savedObjectType: monitor.type,
          namespace: monitor.namespaces?.[0],
        };

        // Without both there is nothing to look the monitor up by at the service.
        if (!id || !type) {
          notRetained.set(monitor.id, candidate);
          continue;
        }

        serviceLocations.forEach(({ id: locationId }) => {
          candidatesByLocation.set(locationId, [
            ...(candidatesByLocation.get(locationId) ?? []),
            candidate,
          ]);
        });
      }

      await retainAllLocations(RETAIN_PAGE_SIZE);
    }
    await retainAllLocations();
    finder.close().catch(() => {});

    this.logger.debug(
      `${retainedCount} unchanged monitors were retained at the synthetics service, ${notRetained.size} need a full sync.`
    );

    return Array.from(notRetained.values());
  }

  private async getDecryptedMonitors(candidates: RetainCandidate[]) {
    const encryptedClient = this.server.encryptedSavedObjects.getClient();

    const monitors = await pMap(
      candidates,
      async ({ savedObjectType, savedObjectId, namespace }) => {
        try {
          return await encryptedClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
            savedObjectType,
            savedObjectId,
            { namespace }
          );
        } catch (error) {
          // most likely deleted since it was listed, so there is nothing left to send
          this.logger.debug(`Could not read monitor ${savedObjectId} to sync it: ${error.message}`);
        }
      },
      { concurrency: FETCH_MONITOR_CONCURRENCY }
    );

    return monitors.filter((monitor): monitor is NonNullable<typeof monitor> => !!monitor);
  }

  async runOnceConfigs(configs?: ConfigData) {
    if (!configs) {
      return;
    }
    const monitors = this.formatConfigs(configs, []);
    if (monitors.length === 0) {
      return;
    }
    const license = await this.getLicense();

    const { output } = await this.getOutput();
    if (!output) {
      return;
    }

    try {
      return await this.apiClient.runOnce({
        monitors,
        output,
        license,
      });
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async deleteConfigs(configs: ConfigData[]) {
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
          monitors: this.formatConfigs(configs, []),
          license,
        };
        return await this.apiClient.delete(data);
      }
    } catch (e) {
      this.server.logger.error(e);
    }
  }

  async deleteAllConfigs() {
    const license = await this.getLicense();
    const finder = await this.getSOClientFinder({ pageSize: 100 });
    const { output } = await this.getOutput();
    if (!output) {
      return;
    }

    for await (const result of finder.find()) {
      const monitors = this.normalizeConfigs(result.saved_objects, {}, []);
      const hasPublicLocations = monitors.some((config) =>
        config.locations.some(({ isServiceManaged }) => isServiceManaged)
      );

      if (hasPublicLocations) {
        const data = {
          output,
          monitors,
          license,
        };
        return await this.apiClient.delete(data);
      }
    }
  }

  async getSyntheticsParams({
    spaceId,
    hideParams = false,
    canSave = true,
  }: { spaceId?: string; canSave?: boolean; hideParams?: boolean } = {}) {
    if (!canSave) {
      return Object.create(null);
    }
    const encryptedClient = this.server.encryptedSavedObjects.getClient();

    const paramsBySpace: Record<string, Record<string, string>> = Object.create(null);

    const finder =
      await encryptedClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsParams>({
        type: syntheticsParamType,
        perPage: 1000,
        namespaces: spaceId ? [spaceId] : [ALL_SPACES_ID],
      });

    for await (const response of finder.find()) {
      response.saved_objects.forEach((param) => {
        param.namespaces?.forEach((namespace) => {
          if (!paramsBySpace[namespace]) {
            paramsBySpace[namespace] = Object.create(null);
          }
          paramsBySpace[namespace][param.attributes.key] = hideParams
            ? '"*******"'
            : param.attributes.value;
        });
      });
    }

    // no need to wait here
    finder.close().catch(() => {});

    if (paramsBySpace[ALL_SPACES_ID]) {
      Object.keys(paramsBySpace).forEach((space) => {
        if (space !== ALL_SPACES_ID) {
          paramsBySpace[space] = {
            ...(paramsBySpace[space] ?? {}),
            ...(paramsBySpace[ALL_SPACES_ID] ?? {}),
          };
        }
      });
      if (spaceId) {
        paramsBySpace[spaceId] = {
          ...(paramsBySpace?.[spaceId] ?? {}),
          ...(paramsBySpace?.[ALL_SPACES_ID] ?? {}),
        };
      }
    }

    return paramsBySpace;
  }

  async getMaintenanceWindows(spaceId: string) {
    const maintenanceWindowClient = this.server.getMaintenanceWindowClientInternal(
      {} as KibanaRequest
    );

    if (!maintenanceWindowClient) {
      return [];
    }

    const mws = await maintenanceWindowClient.find({
      page: 0,
      perPage: 1000,
      namespaces: [spaceId],
    });
    return mws.data;
  }

  formatConfigs(configData: ConfigData[] | ConfigData, mws: MaintenanceWindow[]) {
    const configDataList = Array.isArray(configData) ? configData : [configData];

    return configDataList.map((config) => {
      const { str: paramsString, params } = mixParamsWithGlobalParams(
        config.params,
        config.monitor
      );

      const asHeartbeatConfig = formatHeartbeatRequest(config, paramsString);

      return formatMonitorConfigFields(
        Object.keys(asHeartbeatConfig) as ConfigKey[],
        asHeartbeatConfig as Partial<MonitorFields>,
        this.logger,
        params ?? {},
        mws
      );
    });
  }

  normalizeConfigs(
    monitors: Array<SavedObject<SyntheticsMonitorWithSecretsAttributes>>,
    paramsBySpace: Record<string, Record<string, string>>,
    mws: MaintenanceWindow[]
  ) {
    const configDataList = (monitors ?? []).map((monitor) => {
      const attributes = monitor.attributes as unknown as MonitorFields;
      const monitorSpace = monitor.namespaces?.[0] ?? DEFAULT_SPACE_ID;

      const params = paramsBySpace[monitorSpace] ?? {};

      return {
        params: { ...params, ...(paramsBySpace?.[ALL_SPACES_ID] ?? {}) },
        monitor: normalizeSecrets(monitor).attributes,
        configId: monitor.id,
        heartbeatId: attributes[ConfigKey.MONITOR_QUERY_ID],
        spaceId: monitorSpace,
        kibanaUrl: this.server.basePath.publicBaseUrl ?? undefined,
      };
    });

    return this.formatConfigs(configDataList, mws) as MonitorFields[];
  }
  checkMissingSchedule(state: Record<string, string>) {
    try {
      const lastRunAt = state.lastRunAt;
      const current = moment();

      if (lastRunAt) {
        // log if it has missed last schedule
        const diff = moment(current).diff(lastRunAt, 'minutes');
        const syncInterval = Number((this.config.syncInterval ?? '5m').split('m')[0]) + 5;
        if (diff > syncInterval) {
          const message = `Synthetics monitor sync task has missed its schedule, it last ran ${diff} minutes ago.`;
          this.logger.warn(message);
          sendErrorTelemetryEvents(this.logger, this.server.telemetry, {
            message,
            reason: 'Failed to run synthetics sync task on schedule',
            type: 'syncTaskMissedSchedule',
            stackVersion: this.server.stackVersion,
          });
        }
        this.logger.debug(`Synthetics monitor sync task last ran ${diff} minutes ago.`);
      }
      state.lastRunAt = current.toISOString();
    } catch (e) {
      this.logger.error(e);
    }
  }
}

class IndexTemplateInstallationError extends Error {
  constructor() {
    super();
    this.message = 'Failed to install synthetics index templates.';
    this.name = 'IndexTemplateInstallationError';
  }
}
