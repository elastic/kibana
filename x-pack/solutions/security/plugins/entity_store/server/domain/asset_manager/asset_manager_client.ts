/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick, omit } from 'lodash';
import type { Logger } from '@kbn/logging';
import type {
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { CheckPrivilegesResponse } from '@kbn/security-plugin-types-server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { EntityType } from '../../../common';
import { scheduleExtractEntityTask, stopExtractEntityTask } from '../../tasks/extract_entity_task';
import {
  scheduleHistorySnapshotTasks,
  stopHistorySnapshotTask,
} from '../../tasks/history_snapshot_task';
import { scheduleStatusReportTask, stopStatusReportTask } from '../../tasks/status_report_task';
import { installSharedElasticsearchAssets, uninstallElasticsearchAssets } from './install_assets';
import {
  EngineDescriptorTypeName,
  type EngineDescriptor,
  type EngineDescriptorClient,
  type EntityStoreGlobalStateClient,
  DEFAULT_LOG_EXTRACTION_OVERRIDES,
  type EngineLogExtractionOverrides,
  HistorySnapshotState,
  LogExtractionConfig,
} from '../saved_objects';
import {
  mergeLogExtractionOverrides,
  getExplicitOverrideFields,
  OVERRIDABLE_LOG_EXTRACTION_FIELDS,
  type OverridableLogExtractionField,
  type LogExtractionOverridePatch,
} from '../logs_extraction/log_extraction_overrides';
import type {
  HistorySnapshotBodyParams,
  LogExtractionInstallParams,
  LogExtractionUpdateParams,
} from '../../routes/constants';
import {
  ENGINE_STATUS,
  ENTITY_STORE_CLUSTER_PRIVILEGES,
  ENTITY_STORE_SOURCE_INDICES_PRIVILEGES,
  ENTITY_STORE_STATUS,
  ENTITY_STORE_TARGET_INDICES_PRIVILEGES,
} from '../constants';
import type {
  EntityStoreStatus,
  EngineComponentStatus,
  EngineComponentResource,
  GetStatusResult,
} from '../types';
import { getExtractEntityTaskId } from '../../tasks/extract_entity_task';
import {
  getEntitiesAlias,
  ENTITY_LATEST,
  getLatestEntitiesIndexName,
} from '../../../common/domain/entity_index';
import { getLatestIndexTemplateId } from './latest_index_template';
import { getUpdatesIndexTemplateId } from './updates_index_template';
import { getComponentTemplateName, getUpdatesComponentTemplateName } from './component_templates';
import { getUpdatesEntitiesDataStreamName } from './updates_data_stream';
import type { LogsExtractionClient } from '../logs_extraction';
import type { RemoteLogExtractionStateClient } from '../saved_objects/remote_log_extraction_state';
import type { ManagedEntityDefinition } from '../../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { installEuidStoredScripts, deleteEuidStoredScripts } from './euid_stored_scripts';
import {
  type TelemetryReporter,
  ENTITY_STORE_DELETION_EVENT,
  ENTITY_STORE_INITIALIZATION_EVENT,
  ENTITY_STORE_INITIALIZATION_FAILURE_EVENT,
} from '../../telemetry/events';
import { getErrorMessage } from '../../../common';
import { stopAndRemoveV1, stopAndRemoveV1SharedTasks } from '../../infra/remove_v1';

interface AssetManagerDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  taskManager: TaskManagerStartContract;
  engineDescriptorClient: EngineDescriptorClient;
  globalStateClient: EntityStoreGlobalStateClient;
  remoteLogExtractionStateClient: RemoteLogExtractionStateClient;
  namespace: string;
  isServerless: boolean;
  logsExtractionClient: LogsExtractionClient;
  security: SecurityPluginStart;
  analytics: TelemetryReporter;
  savedObjectsClient: SavedObjectsClientContract;
}

export class AssetManagerClient {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly taskManager: TaskManagerStartContract;
  private readonly engineDescriptorClient: EngineDescriptorClient;
  private readonly globalStateClient: EntityStoreGlobalStateClient;
  private readonly remoteLogExtractionStateClient: RemoteLogExtractionStateClient;
  private readonly namespace: string;
  private readonly isServerless: boolean;
  private readonly logsExtractionClient: LogsExtractionClient;
  private readonly security: SecurityPluginStart;
  private readonly analytics: TelemetryReporter;
  private readonly savedObjectsClient: SavedObjectsClientContract;

  constructor(deps: AssetManagerDependencies) {
    this.logger = deps.logger;
    this.esClient = deps.esClient;
    this.taskManager = deps.taskManager;
    this.engineDescriptorClient = deps.engineDescriptorClient;
    this.globalStateClient = deps.globalStateClient;
    this.remoteLogExtractionStateClient = deps.remoteLogExtractionStateClient;
    this.namespace = deps.namespace;
    this.isServerless = deps.isServerless;
    this.logsExtractionClient = deps.logsExtractionClient;
    this.security = deps.security;
    this.analytics = deps.analytics;
    this.savedObjectsClient = deps.savedObjectsClient;
  }

  public async init(
    request: KibanaRequest,
    entityTypes: EntityType[],
    logsExtractionParams?: LogExtractionInstallParams,
    historySnapshotParams?: HistorySnapshotBodyParams
  ) {
    try {
      const existingState = await this.globalStateClient.find();
      const logsExtraction = resolveLogsExtractionOnInstall(
        existingState?.logsExtraction,
        logsExtractionParams
      );
      const historySnapshot = HistorySnapshotState.parse(historySnapshotParams ?? {});
      // Caller-supplied overridable fields are an explicit request for the whole store and
      // must win over a type's built-in default override (e.g. Service/Generic's reduced
      // frequency) — otherwise existing consumers who set a custom value at install time
      // would silently stop getting it for those types.
      const explicitOverrideFields = getExplicitOverrideFields(logsExtractionParams);

      // Phase 1: Install shared ES assets/storage and run independent setup tasks.
      await Promise.all([
        this.globalStateClient.init({ historySnapshot, logsExtraction }),

        ...entityTypes.map((type) =>
          stopAndRemoveV1({
            type,
            namespace: this.namespace,
            logger: this.logger,
            esClient: this.esClient,
            taskManager: this.taskManager,
            savedObjectsClient: this.savedObjectsClient,
          })
        ),
        stopAndRemoveV1SharedTasks({
          namespace: this.namespace,
          logger: this.logger,
          taskManager: this.taskManager,
        }),

        installSharedElasticsearchAssets({
          esClient: this.esClient,
          logger: this.logger,
          namespace: this.namespace,
        }),
      ]);

      // Phase 2: Initialize engines and start background tasks.
      await Promise.all([
        ...entityTypes.map((type) =>
          this.initEntity(request, type, logsExtraction, explicitOverrideFields)
        ),

        scheduleHistorySnapshotTasks({
          logger: this.logger,
          taskManager: this.taskManager,
          namespace: this.namespace,
          request,
          frequency: historySnapshot.frequency,
        }),

        scheduleStatusReportTask({
          logger: this.logger,
          taskManager: this.taskManager,
          namespace: this.namespace,
          request,
        }),

        installEuidStoredScripts({
          esClient: this.esClient,
          logger: this.logger,
        }),
      ]);
    } catch (error) {
      this.analytics.reportEvent(ENTITY_STORE_INITIALIZATION_FAILURE_EVENT, {
        namespace: this.namespace,
        error: getErrorMessage(error),
      });
      this.logger.error('Error during entity store init:', error);
      throw error;
    }
  }

  public async start(request: KibanaRequest, type: EntityType, { frequency }: LogExtractionConfig) {
    try {
      this.logger.get(type).debug(`Scheduling extract entity task for type: ${type}`);

      await this.engineDescriptorClient.update(type, { status: ENGINE_STATUS.STARTED });

      await scheduleExtractEntityTask({
        logger: this.logger,
        taskManager: this.taskManager,
        type,
        frequency,
        namespace: this.namespace,
        request,
      });
    } catch (error) {
      this.logger.get(type).error(`Error starting extract entity task for type ${type}:`, error);
      await this.engineDescriptorClient.update(type, { status: ENGINE_STATUS.ERROR });
      throw error;
    }
  }

  public async stop(type: EntityType) {
    try {
      await stopExtractEntityTask({
        taskManager: this.taskManager,
        logger: this.logger,
        type,
        namespace: this.namespace,
      });
      await this.engineDescriptorClient.update(type, { status: ENGINE_STATUS.STOPPED });
    } catch (error) {
      this.logger.get(type).error(`Error stopping extract entity task for type ${type}:`, error);
      await this.engineDescriptorClient.update(type, { status: ENGINE_STATUS.ERROR });
      throw error;
    }
  }

  public async uninstall(type: EntityType) {
    try {
      const { engines } = await this.getStatus();
      if (!engines.some((e) => e.type === type)) {
        return false;
      }
      await this.stop(type);

      await Promise.all([
        this.engineDescriptorClient.delete(type),
        this.remoteLogExtractionStateClient.delete(type),
        uninstallElasticsearchAssets({
          esClient: this.esClient,
          logger: this.logger.get(type),
          namespace: this.namespace,
        }),
        deleteEuidStoredScripts({
          esClient: this.esClient,
          logger: this.logger,
        }),
      ]);

      const remainingEngines = await this.engineDescriptorClient.getAll();
      if (remainingEngines.length === 0) {
        this.logger.debug(`Deleting global state because last engine was uninstalled`);
        await Promise.all([
          this.globalStateClient.delete(),
          stopStatusReportTask({
            taskManager: this.taskManager,
            logger: this.logger,
            namespace: this.namespace,
          }),
          stopHistorySnapshotTask({
            taskManager: this.taskManager,
            logger: this.logger,
            namespace: this.namespace,
          }),
        ]);
      }

      this.logger.get(type).debug(`Uninstalled definition: ${type}`);
      this.analytics.reportEvent(ENTITY_STORE_DELETION_EVENT, {
        entityType: type,
        namespace: this.namespace,
      });
      return true;
    } catch (error) {
      this.logger.get(type).error(`Error uninstalling assets for entity type ${type}`, { error });
      throw error;
    }
  }

  public async getStatus(withComponents: boolean = false): Promise<GetStatusResult> {
    try {
      const [engines, { historySnapshot, logsExtraction: logsExtractionConfig }] =
        await Promise.all([
          this.engineDescriptorClient.getAll(),
          this.globalStateClient.findOrThrow(),
        ]);

      const status = this.calculateEntityStoreStatus(engines);

      if (withComponents) {
        const enginesWithComponents = await Promise.all(
          engines.map((engine) => this.getEngineWithComponents(engine))
        );
        return {
          status,
          engines: enginesWithComponents,
          historySnapshot,
          logsExtractionConfig,
        };
      }

      return { status, engines, historySnapshot, logsExtractionConfig };
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return { status: ENTITY_STORE_STATUS.NOT_INSTALLED, engines: [] };
      }

      this.logger.error('Error getting status', { error });
      throw error;
    }
  }

  public async getLogExtractionConfig(): Promise<LogExtractionConfig> {
    const globalState = await this.globalStateClient.find();
    return globalState?.logsExtraction ?? LogExtractionConfig.parse({});
  }

  private async initEntity(
    request: KibanaRequest,
    type: EntityType,
    logsExtractionConfig: LogExtractionConfig,
    explicitOverrideFields: OverridableLogExtractionField[]
  ): Promise<boolean> {
    // A caller-supplied field wins over this type's built-in default for that field
    // (e.g. Service/Generic's reduced frequency); untouched fields still seed the
    // type's default.
    const overridesToSeed = clearFields(
      DEFAULT_LOG_EXTRACTION_OVERRIDES[type],
      explicitOverrideFields
    );
    const installed = await this.install(type, overridesToSeed);
    if (installed) {
      // Schedule the extraction task at the effective (merged) frequency, not the raw
      // global one, so the seeded override takes effect immediately.
      const effectiveConfig = mergeLogExtractionOverrides(logsExtractionConfig, overridesToSeed);
      await this.start(request, type, effectiveConfig);
    }
    this.analytics.reportEvent(ENTITY_STORE_INITIALIZATION_EVENT, {
      entityType: type,
      namespace: this.namespace,
    });
    return installed;
  }

  public async getPrivileges(
    request: KibanaRequest,
    additionalIndexPatterns: string[] = []
  ): Promise<CheckPrivilegesResponse> {
    const checkPrivileges = this.security.authz.checkPrivilegesDynamicallyWithRequest(request);

    const sourceIndexPatterns = await this.logsExtractionClient.getLocalIndexPatterns(
      additionalIndexPatterns
    );

    const kibanaPrivileges = this.security.authz.actions.savedObject.get(
      EngineDescriptorTypeName,
      'create'
    );

    // _has_privileges treats a leading `-` as a literal index name, not an exclusion.
    // Negative patterns are a query-time directive and have no meaning here.
    const sourceIndexPrivileges = Object.fromEntries(
      sourceIndexPatterns
        .filter((idx) => !idx.startsWith('-'))
        .map((idx) => [idx, ENTITY_STORE_SOURCE_INDICES_PRIVILEGES])
    );

    const targetIndexPrivileges = {
      [getEntitiesAlias(ENTITY_LATEST, this.namespace)]: ENTITY_STORE_TARGET_INDICES_PRIVILEGES,
    };

    return checkPrivileges({
      kibana: [kibanaPrivileges],
      elasticsearch: {
        cluster: ENTITY_STORE_CLUSTER_PRIVILEGES,
        index: { ...targetIndexPrivileges, ...sourceIndexPrivileges },
      },
    });
  }

  public async install(
    type: EntityType,
    logExtractionOverrides: EngineLogExtractionOverrides = DEFAULT_LOG_EXTRACTION_OVERRIDES[type]
  ): Promise<boolean> {
    try {
      const { engines } = await this.getStatus();
      if (engines.some((e) => e.type === type)) {
        return false;
      }

      this.logger.get(type).debug(`Installing assets for entity type: ${type}`);
      // Engine installation is per-type. Shared indices and data streams are created once
      // during `init()` before parallel engine initialization begins.
      await this.engineDescriptorClient.init(type, logExtractionOverrides);
      this.logger.debug(`Installed definition: ${type}`);

      return true;
    } catch (error) {
      this.logger.error(`Error installing assets for entity type ${type}`, { error });
      throw error;
    }
  }

  /**
   * Installs a single entity type. Accepts the same `logExtraction` shape as `init` — but
   * scoped to one type: the overridable fields (`OVERRIDABLE_LOG_EXTRACTION_FIELDS`) become
   * this type's per-type override, while every other field (index patterns, volume limits,
   * etc.) is applied to the shared global config exactly as the store-wide install would. If
   * the store isn't installed yet, this bootstraps the whole Entity Store (shared indices/
   * templates, global state, EUID scripts, shared history-snapshot/status-report tasks) for
   * this one type; if the store is already installed by other types, only this type is
   * added. A no-op (returns `false`) if this type is already installed.
   */
  public async installByType(
    request: KibanaRequest,
    type: EntityType,
    logsExtractionParams?: LogExtractionInstallParams
  ): Promise<boolean> {
    const { status, engines } = await this.getStatus();

    if (engines.some((e) => e.type === type)) {
      return false;
    }

    const explicitOverrideFields = getExplicitOverrideFields(logsExtractionParams);
    const override: LogExtractionOverridePatch = pick(logsExtractionParams, explicitOverrideFields);
    const nonOverridableParams = omit(logsExtractionParams, OVERRIDABLE_LOG_EXTRACTION_FIELDS);

    if (status === ENTITY_STORE_STATUS.NOT_INSTALLED) {
      await this.init(request, [type], nonOverridableParams);
    } else {
      if (Object.keys(nonOverridableParams).length > 0) {
        const existingState = await this.globalStateClient.find();
        const logsExtraction = resolveLogsExtractionOnInstall(
          existingState?.logsExtraction,
          nonOverridableParams
        );
        await this.globalStateClient.init({ logsExtraction });
      }
      const globalConfig = await this.getLogExtractionConfig();
      const installed = await this.install(type, DEFAULT_LOG_EXTRACTION_OVERRIDES[type]);
      if (installed) {
        const effectiveConfig = mergeLogExtractionOverrides(
          globalConfig,
          DEFAULT_LOG_EXTRACTION_OVERRIDES[type]
        );
        await this.start(request, type, effectiveConfig);
      }
    }

    if (Object.keys(override).length > 0) {
      await this.updateByType(request, type, override);
    }
    return true;
  }

  /**
   * Updates a single entity type's log extraction override. Only the fields present in
   * `override` are changed — there is no way to clear a field back to the shared global
   * value; callers must set it explicitly. Reschedules the type's extraction task
   * immediately when its effective frequency changes and the engine is currently started
   * — frequency is the only overridable field that drives a Task Manager schedule.
   */
  public async updateByType(
    request: KibanaRequest,
    type: EntityType,
    override: LogExtractionOverridePatch
  ): Promise<EngineLogExtractionOverrides> {
    const engine = await this.engineDescriptorClient.findOrThrow(type);
    const newOverride = mergeOverrideFields(engine.logExtractionOverrides, override);
    const frequencyChanged =
      override.frequency !== undefined &&
      newOverride.frequency !== engine.logExtractionOverrides.frequency;

    const globalConfig = await this.getLogExtractionConfig();
    await this.persistOverrideAndReschedule(
      request,
      engine,
      newOverride,
      globalConfig,
      frequencyChanged
    );
    return newOverride;
  }

  /**
   * Updates the shared, store-wide log extraction config. Any overridable field explicitly
   * supplied here (see `OVERRIDABLE_LOG_EXTRACTION_FIELDS`) is a deliberate request for
   * the whole store and resets that field's per-type override — via `PUT /{entityType}`
   * or a built-in default (e.g. Service/Generic) — for every entity type, so the newly
   * set global value applies uniformly.
   */
  public async updateGlobalLogExtraction(
    request: KibanaRequest,
    params: LogExtractionUpdateParams
  ): Promise<LogExtractionConfig> {
    const updatedConfig = await this.logsExtractionClient.updateConfig(params);
    const explicitFields = getExplicitOverrideFields(params);
    await this.clearOverridesForFields(request, explicitFields, updatedConfig);
    return updatedConfig;
  }

  private async persistOverrideAndReschedule(
    request: KibanaRequest,
    engine: EngineDescriptor,
    newOverride: EngineLogExtractionOverrides,
    globalConfig: LogExtractionConfig,
    frequencyChanged: boolean
  ): Promise<void> {
    await this.engineDescriptorClient.update(engine.type, { logExtractionOverrides: newOverride });
    if (frequencyChanged && engine.status === ENGINE_STATUS.STARTED) {
      const effectiveConfig = mergeLogExtractionOverrides(globalConfig, newOverride);
      await scheduleExtractEntityTask({
        logger: this.logger,
        taskManager: this.taskManager,
        type: engine.type,
        frequency: effectiveConfig.frequency,
        namespace: this.namespace,
        request,
      });
    }
  }

  private async clearOverridesForFields(
    request: KibanaRequest,
    explicitFields: OverridableLogExtractionField[],
    updatedGlobalConfig: LogExtractionConfig
  ): Promise<void> {
    if (explicitFields.length === 0) {
      return;
    }

    const engines = await this.engineDescriptorClient.getAll();
    await Promise.all(
      engines.map((engine) => {
        const touchedFieldsWithOverride = explicitFields.filter(
          (field) => engine.logExtractionOverrides[field] !== null
        );
        if (touchedFieldsWithOverride.length === 0) {
          return Promise.resolve();
        }
        const newOverride = clearFields(engine.logExtractionOverrides, explicitFields);
        const frequencyChanged = touchedFieldsWithOverride.includes('frequency');
        return this.persistOverrideAndReschedule(
          request,
          engine,
          newOverride,
          updatedGlobalConfig,
          frequencyChanged
        );
      })
    );
  }

  private async getEngineWithComponents(
    engine: EngineDescriptor
  ): Promise<EngineDescriptor & { components: EngineComponentStatus[] }> {
    const definition = getEntityDefinition(engine.type, this.namespace);
    const components = await this.getComponentsForEngine(engine.type, definition);
    return { ...engine, components };
  }

  private async getComponentsForEngine(
    type: EntityType,
    definition: ManagedEntityDefinition
  ): Promise<EngineComponentStatus[]> {
    const [
      entityDefinitionComponent,
      indexTemplateComponents,
      indexComponents,
      componentTemplateComponents,
      ilmPolicyComponents,
      taskComponent,
    ] = await Promise.all([
      this.getEntityDefinitionComponent(definition),
      this.getIndexTemplateComponents(),
      this.getIndexComponents(),
      this.getComponentTemplateComponents(definition),
      this.getIlmPolicyComponents(),
      this.getExtractEntityTaskComponent(type),
    ]);

    return [
      entityDefinitionComponent,
      ...indexTemplateComponents,
      ...indexComponents,
      ...componentTemplateComponents,
      ...ilmPolicyComponents,
      taskComponent,
    ];
  }

  private getEntityDefinitionComponent(definition: ManagedEntityDefinition): EngineComponentStatus {
    return {
      id: definition.id,
      installed: true,
      resource: 'entity_definition',
    };
  }

  private async getIndexTemplateComponents(): Promise<EngineComponentStatus[]> {
    const resource = 'index_template';
    const latestId = getLatestIndexTemplateId(this.namespace);
    const updatesId = getUpdatesIndexTemplateId(this.namespace);
    const [latestExists, updatesExists] = await Promise.all([
      this.tryAsBoolean(this.esClient.indices.getIndexTemplate({ name: latestId })),
      this.tryAsBoolean(this.esClient.indices.getIndexTemplate({ name: updatesId })),
    ]);
    return [
      { id: latestId, installed: latestExists, resource },
      { id: updatesId, installed: updatesExists, resource },
    ];
  }

  private async getIndexComponents(): Promise<EngineComponentStatus[]> {
    const resource: EngineComponentResource = 'index';
    const latestIndex = getLatestEntitiesIndexName(this.namespace);
    const updatesDataStreamName = getUpdatesEntitiesDataStreamName(this.namespace);
    const [latestExists, updatesExists] = await Promise.all([
      this.esClient.indices.exists({ index: latestIndex }),
      this.tryAsBoolean(this.esClient.indices.getDataStream({ name: updatesDataStreamName })),
    ]);
    return [
      { id: latestIndex, installed: latestExists, resource },
      { id: updatesDataStreamName, installed: updatesExists, resource },
    ];
  }

  private async getComponentTemplateComponents(
    definition: ManagedEntityDefinition
  ): Promise<EngineComponentStatus[]> {
    const resource: EngineComponentResource = 'component_template';
    const latestName = getComponentTemplateName(definition.type, this.namespace);
    const updatesName = getUpdatesComponentTemplateName(definition.type, this.namespace);
    const [latestExists, updatesExists] = await Promise.all([
      this.tryAsBoolean(this.esClient.cluster.getComponentTemplate({ name: latestName })),
      this.tryAsBoolean(this.esClient.cluster.getComponentTemplate({ name: updatesName })),
    ]);
    return [
      { id: latestName, installed: latestExists, resource },
      { id: updatesName, installed: updatesExists, resource },
    ];
  }

  private async getIlmPolicyComponents(): Promise<EngineComponentStatus[]> {
    if (this.isServerless) {
      return [];
    }
    const resource: EngineComponentResource = 'ilm_policy';
    const ilmPolicyNames: string[] = [];
    // TODO: add ilm policy names to ilmPolicyNames
    return Promise.all(
      ilmPolicyNames.map(async (name) => {
        const installed = await this.tryAsBoolean(this.esClient.ilm.getLifecycle({ name }));
        return { id: name, installed, resource };
      })
    );
  }

  private async getExtractEntityTaskComponent(type: EntityType): Promise<EngineComponentStatus> {
    const taskId = getExtractEntityTaskId(type, this.namespace);
    try {
      const task = await this.taskManager.get(taskId);
      return {
        id: taskId,
        installed: true,
        resource: 'task',
        status: task.state.status ?? null,
        remainingLogsToExtract: await this.logsExtractionClient.getRemainingLogsCount(type),
        runs: task.state.runs ?? 0,
        lastError: task.state.lastError ?? null,
      };
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return {
          id: taskId,
          installed: false,
          resource: 'task',
        };
      }
      throw e;
    }
  }

  /**
   * Runs an async operation. Returns true if the promise resolves (no failure),
   * or false if it throws.
   */

  private async tryAsBoolean(promise: Promise<unknown>): Promise<boolean> {
    try {
      await promise;
      return true;
    } catch {
      return false;
    }
  }

  private calculateEntityStoreStatus(engines: EngineDescriptor[]): EntityStoreStatus {
    if (engines.length === 0) {
      return ENTITY_STORE_STATUS.NOT_INSTALLED;
    } else if (engines.some((engine) => engine.status === ENGINE_STATUS.ERROR)) {
      return ENTITY_STORE_STATUS.ERROR;
    } else if (engines.every((engine) => engine.status === ENGINE_STATUS.STOPPED)) {
      return ENTITY_STORE_STATUS.STOPPED;
    } else if (engines.some((engine) => engine.status === ENGINE_STATUS.INSTALLING)) {
      return ENTITY_STORE_STATUS.INSTALLING;
    }

    return ENTITY_STORE_STATUS.RUNNING;
  }
}

function resolveLogsExtractionOnInstall(
  existing: LogExtractionConfig | undefined,
  params: LogExtractionInstallParams | undefined
): LogExtractionConfig {
  const hasParams = params !== undefined && Object.keys(params).length > 0;
  if (hasParams) {
    // Merge onto `existing`, not a full replace — otherwise fields the caller didn't
    // mention would fall back to LogExtractionConfig's defaults instead of keeping
    // whatever was already persisted.
    return LogExtractionConfig.parse({ ...existing, ...params });
  }
  if (existing !== undefined) {
    return existing;
  }
  return LogExtractionConfig.parse({});
}

/** Overlays any fields explicitly present in `patch` onto `base`; fields absent from
 * `patch` (`undefined`) keep `base`'s value. An explicit `null` in `patch` wins, clearing
 * that field. */
function mergeOverrideFields(
  base: EngineLogExtractionOverrides,
  patch: Partial<EngineLogExtractionOverrides> | undefined
): EngineLogExtractionOverrides {
  const merged = { ...base };
  for (const field of OVERRIDABLE_LOG_EXTRACTION_FIELDS) {
    merged[field] = patch?.[field] !== undefined ? patch[field] : base[field];
  }
  return merged;
}

/** Sets each field in `fieldsToClear` to `null` (no override); other fields are unchanged. */
function clearFields(
  overrides: EngineLogExtractionOverrides,
  fieldsToClear: OverridableLogExtractionField[]
): EngineLogExtractionOverrides {
  if (fieldsToClear.length === 0) {
    return overrides;
  }
  const nullPatch = Object.fromEntries(fieldsToClear.map((field) => [field, null])) as Partial<
    Record<OverridableLogExtractionField, null>
  >;
  return mergeOverrideFields(overrides, nullPatch);
}
