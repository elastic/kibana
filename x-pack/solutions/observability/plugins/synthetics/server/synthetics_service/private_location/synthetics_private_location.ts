/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  NewPackagePolicy,
  PackagePolicy,
  UpdatePackagePolicyWithId,
} from '@kbn/fleet-plugin/common';
import type { NewPackagePolicyWithId } from '@kbn/fleet-plugin/server/services/package_policy';
import { cloneDeep } from 'lodash';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { getAgentPoliciesAsInternalUser } from '../../routes/settings/private_locations/get_agent_policies';
import {
  syntheticsMonitorSOTypes,
  syntheticsMonitorSavedObjectType,
  legacySyntheticsMonitorTypeSingle,
} from '../../../common/types/saved_objects';
import {
  BROWSER_TEST_NOW_RUN,
  LIGHTWEIGHT_TEST_NOW_RUN,
} from '../synthetics_monitor/synthetics_monitor_client';
import { scheduleCleanUpTask } from './clean_up_task';
import type { SyntheticsServerSetup } from '../../types';
import { formatSyntheticsPolicy } from '../formatters/private_formatters/format_synthetics_policy';
import type {
  HeartbeatConfig,
  MonitorFields,
  PrivateLocation,
} from '../../../common/runtime_types';
import {
  ConfigKey,
  SourceType,
  type SyntheticsPrivateLocations,
} from '../../../common/runtime_types';
import { stringifyString } from '../formatters/private_formatters/formatting_utils';
import type { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import { PackagePolicyService } from './package_policy_service';
import { getMonitorCostMib, rebalanceByCost } from './assign_shards';
import {
  assignAgentByHost,
  hostFromCondition,
  hostNameCondition,
  isConditionShardedLocation,
  isEqlSafeLiteral,
  UNASSIGNED_CONDITION,
} from './assign_by_condition';

/**
 * Enrolled agent hosts of a single (condition-sharded) agent policy: the shard
 * set of lowercased, EQL-safe host names plus each host's `host.id`, used to
 * pin a monitor to exactly one machine.
 */
interface EnrolledAgentHosts {
  names: string[];
  idByHost: Map<string, string>;
}
import { runRebalanceShardsTaskSoon } from '../../tasks/rebalance_private_location_shards_task';

export interface PrivateConfig {
  config: HeartbeatConfig;
  globalParams: Record<string, string>;
}

export interface FailedPolicyUpdate {
  packagePolicy: NewPackagePolicyWithId;
  config?: HeartbeatConfig;
  error?: Error | SavedObjectError;
}

export class SyntheticsPrivateLocation {
  private readonly server: SyntheticsServerSetup;
  private readonly packagePolicyService: PackagePolicyService;

  constructor(_server: SyntheticsServerSetup) {
    this.server = _server;
    this.packagePolicyService = new PackagePolicyService(_server);
  }

  async buildNewPolicy(spaceId: string): Promise<NewPackagePolicy> {
    const newPolicy = await this.packagePolicyService.buildPackagePolicyFromPackage({ spaceId });

    if (!newPolicy) {
      throw new Error(`Unable to create Synthetics package policy template for private location`);
    }

    return newPolicy;
  }

  /**
   * Returns the new (space-agnostic) policy ID format.
   * Format: `${configId}-${locationId}`
   * This removes the spaceId dependency to support multispace monitors.
   */
  getPolicyId(config: { origin?: string; id: string }, locId: string) {
    return `${config.id}-${locId}`;
  }

  getPolicyName(config: { id: string; origin?: string; name: string }, locName: string) {
    if (config.origin === SourceType.PROJECT) {
      return `${config.id}-${locName}`;
    }
    return `${config.name}-${locName}`;
  }

  async getPolicyNamespace(configNamespace: string) {
    if (configNamespace && configNamespace !== DEFAULT_NAMESPACE_STRING) {
      return configNamespace;
    }
    return undefined;
  }

  /**
   * Checks whether new-format or legacy-format policy IDs exist for a given monitor + location.
   *
   * Finds legacy IDs (`{configId}-{locationId}-{spaceId}`) via prefix match + suffix
   * validation against known spaces. Suffix validation uses O(1) Set lookup, keeping
   * performance identical to plain prefix matching regardless of space count.
   *
   * This prevents most false positives — e.g. monitor "monitor-a" / location "loc-b"
   * won't match policies for monitor "monitor-a-loc-b", because the suffix after
   * "monitor-a-loc-b-" won't be a known space. A residual ambiguity remains when space IDs contain dashes (inherent to
   * the dash-separated legacy format), but is unlikely in practice since it
   * requires monitor IDs, location IDs, and space names to overlap in a specific way.
   */
  getPolicyIdFormatInfo(
    config: { id: string },
    locationId: string,
    existingPolicies: Array<{ id: string }> | undefined,
    allSpaces: Set<string>
  ): { hasNewFormatPolicyId: boolean; hasAnyLegacyPolicyId: boolean; legacyPolicyIds: string[] } {
    const newId = this.getPolicyId(config, locationId);
    const hasNewFormatPolicyId = existingPolicies?.some((policy) => policy.id === newId) ?? false;

    const legacyIdPrefix = `${config.id}-${locationId}-`;
    const legacyPolicyIds =
      existingPolicies
        ?.filter((policy) => {
          if (!policy.id.startsWith(legacyIdPrefix)) return false;
          const spaceId = policy.id.slice(legacyIdPrefix.length);
          return allSpaces.has(spaceId);
        })
        .map((policy) => policy.id) ?? [];
    const hasAnyLegacyPolicyId = legacyPolicyIds.length > 0;

    return { hasNewFormatPolicyId, hasAnyLegacyPolicyId, legacyPolicyIds };
  }

  /**
   * Returns the legacy policy ID format that included spaceId.
   * Format: `${configId}-${locationId}-${spaceId}`
   * Used for backward compatibility when looking up existing policies.
   */
  getLegacyPolicyId(configId: string, locId: string, spaceId: string) {
    return `${configId}-${locId}-${spaceId}`;
  }

  getLegacyPolicyIdsForAllSpaces(configId: string, locId: string, allSpaces: Set<string>) {
    return [...allSpaces].map((space) => this.getLegacyPolicyId(configId, locId, space));
  }

  /**
   * Gets all unique spaces that have any synthetics monitors.
   */
  async getAllSpacesWithMonitors(): Promise<string[]> {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
    const spaces = new Set<string>();

    try {
      const result = await soClient.find<
        unknown,
        {
          namespaces: {
            buckets: Array<{ key: string; doc_count: number }>;
          };
          legacyNamespaces: {
            buckets: Array<{ key: string; doc_count: number }>;
          };
        }
      >({
        type: syntheticsMonitorSOTypes,
        perPage: 0,
        namespaces: [ALL_SPACES_ID],
        fields: [],
        aggs: {
          namespaces: {
            terms: { field: `${syntheticsMonitorSavedObjectType}.namespaces`, size: 1000 },
          },
          legacyNamespaces: {
            terms: { field: `${legacySyntheticsMonitorTypeSingle}.namespaces`, size: 1000 },
          },
        },
      });

      result.aggregations?.namespaces?.buckets?.forEach((bucket) => {
        spaces.add(bucket.key);
      });
      result.aggregations?.legacyNamespaces?.buckets?.forEach((bucket) => {
        spaces.add(bucket.key);
      });
    } catch (e) {
      this.server.logger.error(
        `Error fetching spaces with monitors. Legacy package policies will not be removed: ${e.message}`
      );
    }

    return [...spaces];
  }

  async generateNewPolicy(
    config: HeartbeatConfig,
    privateLocation: PrivateLocation,
    newPolicyTemplate: NewPackagePolicy,
    spaceId: string,
    globalParams: Record<string, string>,
    maintenanceWindows: MaintenanceWindow[],
    testRunId?: string,
    runOnce?: boolean,
    /** Enrolled agent hosts for the location's single agent policy, when it is
     * condition-sharded (scalable). Threaded in once per batch by the caller so
     * we don't query Fleet per monitor. */
    conditionHosts?: EnrolledAgentHosts,
    /** Current `condition` on the package policy being updated (edit path), so
     * we can preserve an existing host pin when we can't compute a fresh
     * assignment. Undefined on the create path (no existing policy). */
    existingCondition?: string | null
  ): Promise<NewPackagePolicy | null> {
    const { label: locName } = privateLocation;

    const newPolicy = cloneDeep(newPolicyTemplate);

    try {
      newPolicy.is_managed = true;
      // Every monitor is pinned to the location's single agent policy.
      newPolicy.policy_id = privateLocation.agentPolicyId;
      newPolicy.policy_ids = [privateLocation.agentPolicyId];
      if (isConditionShardedLocation(privateLocation)) {
        // Scalable location: gate the monitor to its assigned agent with a
        // `${host.name}`/`${host.id}` Elastic Agent condition so exactly one
        // agent runs it (at-most-once, no duplicate runs).
        const names = conditionHosts?.names ?? [];
        const existingHost = hostFromCondition(existingCondition);
        if (existingHost && names.includes(existingHost)) {
          // Idempotent edit/re-sync: the monitor is already pinned to a still-
          // enrolled agent, so keep it. An edit must not re-pin the monitor
          // (rendezvous over the current host set could land it on an enrolled-
          // but-unhealthy agent) — health-driven moves are the rebalance task's job.
          newPolicy.condition = existingCondition ?? UNASSIGNED_CONDITION;
        } else if (names.length) {
          // New monitor, or its pinned agent is no longer enrolled: place it on
          // an enrolled host now; the rebalance task refines for health/balance.
          newPolicy.condition =
            assignAgentByHost(config.id, names, conditionHosts?.idByHost)?.condition ??
            UNASSIGNED_CONDITION;
        } else {
          // No enrolled agents resolved: keep an existing pin if any, else stamp a
          // never-match sentinel so an unassigned monitor runs on NO agent (not
          // every agent) until a create/edit pass or the rebalance task assigns it.
          newPolicy.condition = existingCondition ?? UNASSIGNED_CONDITION;
        }
      } else {
        // Classic location: never pinned. Clear explicitly so turning condition
        // sharding off removes any previously-stamped host condition instead of
        // leaving the monitor stuck on one agent.
        newPolicy.condition = null;
      }
      if (testRunId) {
        newPolicy.name =
          config.type === 'browser' ? BROWSER_TEST_NOW_RUN : LIGHTWEIGHT_TEST_NOW_RUN;
      } else {
        newPolicy.name = this.getPolicyName(config, locName);
      }
      const configNamespace = config[ConfigKey.NAMESPACE];

      newPolicy.namespace = await this.getPolicyNamespace(configNamespace);

      const { formattedPolicy } = formatSyntheticsPolicy(
        newPolicy,
        config.type,
        {
          ...(config as Partial<MonitorFields>),
          space_id: spaceId,
          config_id: config.fields?.config_id,
          location_name: stringifyString(privateLocation.label),
          location_id: privateLocation.id,
          'monitor.project.id':
            config.fields?.['monitor.project.id'] ?? config[ConfigKey.PROJECT_ID],
          'monitor.project.name':
            config.fields?.['monitor.project.name'] ?? config[ConfigKey.PROJECT_ID],
          ...(testRunId
            ? {
                test_run_id: testRunId,
                'monitor.id': config[ConfigKey.MONITOR_QUERY_ID],
                id: testRunId,
              }
            : {}),
          ...(runOnce ? { run_once: runOnce } : {}),
          ...(config.fields?.kibanaUrl ? { kibanaUrl: config.fields.kibanaUrl } : {}),
        },
        globalParams,
        maintenanceWindows
      );

      return formattedPolicy;
    } catch (e) {
      this.server.logger.error(e);
      return null;
    }
  }

  /**
   * Enrolled agent hosts for a single agent policy, read from Fleet agent
   * `local_metadata`. Names are lowercased to match what the agent's own `host`
   * provider reports for `${host.name}` at runtime, and paired with `host.id`
   * (machine UniqueID) so a monitor can be pinned uniquely even when two agents
   * share a hostname. Host names that can't be represented as an EQL literal are
   * skipped (they can't be a shard target without corrupting the condition).
   */
  private async getEnrolledAgentHosts(agentPolicyId: string): Promise<EnrolledAgentHosts> {
    const seenNames = new Set<string>();
    const idByHost = new Map<string, string>();

    const perPage = 1000;
    let page = 1;
    let hasMore = true;
    // Paginate: don't silently drop agents past the first page of a large policy.
    while (hasMore) {
      const { agents } = await this.server.fleet.agentService.asInternalUser.listAgents({
        showInactive: false,
        perPage,
        page,
        kuery: `policy_id:"${agentPolicyId}"`,
      });
      for (const agent of agents) {
        const host = (
          agent.local_metadata as
            | { host?: { name?: string; hostname?: string; id?: string } }
            | undefined
        )?.host;
        const name = (host?.name ?? host?.hostname)?.toLowerCase();
        if (!name) {
          continue;
        }
        if (!isEqlSafeLiteral(name)) {
          this.server.logger.warn(
            `[PrivateLocation] Skipping agent host "${name}" on policy ${agentPolicyId}: not representable in an Elastic Agent condition.`
          );
          continue;
        }
        seenNames.add(name);
        if (host?.id && isEqlSafeLiteral(host.id) && !idByHost.has(name)) {
          idByHost.set(name, host.id);
        }
      }
      hasMore = agents.length === perPage;
      page += 1;
    }

    // Composite shard key: a host is only an assignable target when we have BOTH
    // a safe host.name and a safe host.id, so two agents sharing a hostname can
    // never both match a monitor's condition (at-most-once). Drop hosts missing a
    // usable host.id rather than emit a host.name-only condition.
    const names: string[] = [];
    for (const name of seenNames) {
      if (idByHost.has(name)) {
        names.push(name);
      } else {
        this.server.logger.warn(
          `[PrivateLocation] Skipping agent host "${name}" on policy ${agentPolicyId}: no usable host.id for a composite shard condition.`
        );
      }
    }

    return { names, idByHost };
  }

  /**
   * Resolve enrolled hosts once per batch for every condition-sharded location
   * touched, so {@link generateNewPolicy} can stamp a host condition without a
   * per-monitor Fleet query.
   */
  private async getConditionHostsByLocation(
    locations: Array<{ id: string; agentPolicyId: string; agentConditionSharding?: boolean }>
  ): Promise<Map<string, EnrolledAgentHosts>> {
    const conditionLocations = [
      ...new Map(
        locations.filter((loc) => loc.agentConditionSharding).map((loc) => [loc.id, loc])
      ).values(),
    ];
    const entries = await Promise.all(
      conditionLocations.map(
        async (loc) => [loc.id, await this.getEnrolledAgentHosts(loc.agentPolicyId)] as const
      )
    );
    return new Map(entries);
  }

  async createPackagePolicies(
    configs: PrivateConfig[],
    privateLocations: SyntheticsPrivateLocations,
    spaceId: string,
    maintenanceWindows: MaintenanceWindow[],
    testRunId?: string,
    runOnce?: boolean
  ) {
    if (configs.length === 0) {
      return { created: [], failed: [] };
    }
    const newPolicies: NewPackagePolicyWithId[] = [];
    const newPolicyTemplate = await this.buildNewPolicy(spaceId);
    let touchedScalableLocation = false;
    // One Fleet query per condition-sharded (scalable) location.
    const conditionHostsByLocation = await this.getConditionHostsByLocation(privateLocations);

    for (const { config, globalParams } of configs) {
      try {
        const { locations } = config;
        const fleetManagedLocations = locations.filter((loc) => !loc.isServiceManaged);

        for (const privateLocation of fleetManagedLocations) {
          const location = privateLocations?.find((loc) => loc.id === privateLocation.id)!;
          if (!location) {
            throw new Error(
              `Unable to find Synthetics private location for agentId ${privateLocation.id}`
            );
          }
          if (isConditionShardedLocation(location)) {
            touchedScalableLocation = true;
          }

          const newPolicy = await this.generateNewPolicy(
            config,
            location,
            newPolicyTemplate,
            spaceId,
            globalParams,
            maintenanceWindows,
            testRunId,
            runOnce,
            conditionHostsByLocation.get(location.id)
          );

          if (!newPolicy) {
            throw new Error(
              `Unable to create Synthetics package policy for monitor ${
                config[ConfigKey.NAME]
              } with private location ${location.label}`
            );
          }
          if (newPolicy) {
            if (testRunId) {
              newPolicies.push(newPolicy as NewPackagePolicyWithId);
            } else {
              newPolicies.push({
                ...newPolicy,
                id: this.getPolicyId(config, location.id),
              });
            }
          }
        }
      } catch (e) {
        this.server.logger.error(e);
        throw e;
      }
    }

    if (newPolicies.length === 0) {
      throw new Error('Failed to build package policies for all monitors');
    }

    try {
      const result = await this.packagePolicyService.bulkCreate({
        newPolicies,
        spaceId,
      });
      if (result?.created && result?.created?.length > 0 && testRunId) {
        // ignore await here, we don't want to wait for this to finish
        void scheduleCleanUpTask(this.server);
      }
      // New monitors are assigned to enrolled agents via rendezvous, so one may
      // land on a currently-offline agent. For real (non-test) monitors on a
      // scalable location, kick the rebalance now to relocate those onto healthy
      // agents promptly rather than waiting for the scheduled tick.
      if (!testRunId && !runOnce && touchedScalableLocation) {
        void runRebalanceShardsTaskSoon({ server: this.server });
      }
      return result;
    } catch (e) {
      this.server.logger.error(e);
      throw e;
    }
  }

  async inspectPackagePolicy({
    privateConfig,
    spaceId,
    allPrivateLocations,
    maintenanceWindows,
  }: {
    privateConfig?: PrivateConfig;
    allPrivateLocations: PrivateLocationAttributes[];
    spaceId: string;
    maintenanceWindows: MaintenanceWindow[];
  }) {
    if (!privateConfig) {
      return null;
    }
    const newPolicyTemplate = await this.buildNewPolicy(spaceId);

    const { config, globalParams } = privateConfig;
    try {
      const { locations } = config;

      const privateLocation = locations.find((loc) => !loc.isServiceManaged);

      const location = allPrivateLocations?.find((loc) => loc.id === privateLocation?.id)!;

      const newPolicy = await this.generateNewPolicy(
        config,
        location,
        newPolicyTemplate,
        spaceId,
        globalParams,
        maintenanceWindows
      );

      const pkgPolicy = {
        ...newPolicy,
        id: this.getPolicyId(config, location.id),
      } as NewPackagePolicyWithId;

      return await this.packagePolicyService.inspect({
        spaceId,
        packagePolicy: pkgPolicy,
      });
    } catch (e) {
      this.server.logger.error(e);
      return null;
    }
  }

  async editMonitors(
    configs: Array<{ config: HeartbeatConfig; globalParams: Record<string, string> }>,
    allPrivateLocations: SyntheticsPrivateLocations,
    spaceId: string,
    maintenanceWindows: MaintenanceWindow[]
  ) {
    if (configs.length === 0) {
      return {
        failedUpdates: [],
      };
    }

    const [newPolicyTemplate, { policies: existingPolicies, allSpaces }] = await Promise.all([
      this.buildNewPolicy(spaceId),
      this.getExistingPolicies(
        configs.map(({ config }) => config),
        allPrivateLocations,
        spaceId
      ),
    ]);

    const policiesToUpdate: UpdatePackagePolicyWithId[] = [];
    const policiesToCreate: NewPackagePolicyWithId[] = [];
    const policiesToDelete: string[] = [];
    // One Fleet query per condition-sharded (scalable) location.
    const conditionHostsByLocation = await this.getConditionHostsByLocation(allPrivateLocations);
    // Existing package policies by id, so we can preserve a host condition we
    // can't currently recompute (e.g. no enrolled agents at re-sync time).
    const existingPolicyById = new Map(existingPolicies.map((policy) => [policy.id, policy]));

    for (const { config, globalParams } of configs) {
      const { locations } = config;

      const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);

      for (const privateLocation of allPrivateLocations) {
        const hasLocation = monitorPrivateLocations?.some((loc) => loc.id === privateLocation.id);
        const newId = this.getPolicyId(config, privateLocation.id);
        const { hasNewFormatPolicyId, hasAnyLegacyPolicyId, legacyPolicyIds } =
          this.getPolicyIdFormatInfo(config, privateLocation.id, existingPolicies, allSpaces);
        const hasPolicy = hasNewFormatPolicyId || hasAnyLegacyPolicyId;

        try {
          if (hasLocation) {
            const existingCondition =
              existingPolicyById.get(newId)?.condition ??
              legacyPolicyIds
                .map((id) => existingPolicyById.get(id)?.condition)
                .find((condition) => condition != null);
            const newPolicy = await this.generateNewPolicy(
              config,
              privateLocation,
              newPolicyTemplate,
              spaceId,
              globalParams,
              maintenanceWindows,
              undefined,
              undefined,
              conditionHostsByLocation.get(privateLocation.id),
              existingCondition
            );

            if (!newPolicy) {
              throwAddEditError(hasPolicy, privateLocation.label);
            }

            if (hasNewFormatPolicyId) {
              policiesToUpdate.push({ ...newPolicy, id: newId } as UpdatePackagePolicyWithId);
              policiesToDelete.push(...legacyPolicyIds);
            } else if (hasAnyLegacyPolicyId) {
              policiesToDelete.push(...legacyPolicyIds);
              policiesToCreate.push({ ...newPolicy, id: newId } as NewPackagePolicyWithId);
            } else {
              policiesToCreate.push({ ...newPolicy, id: newId } as NewPackagePolicyWithId);
            }
          } else {
            if (hasNewFormatPolicyId) {
              policiesToDelete.push(newId);
            }
            policiesToDelete.push(...legacyPolicyIds);
          }
        } catch (e) {
          this.server.logger.error(e);
          throwAddEditError(hasPolicy, privateLocation.label, config[ConfigKey.NAME]);
        }
      }
    }

    const uniqueToDelete = [...new Set(policiesToDelete)];

    this.server.logger.debug(
      `[editingMonitors] Creating ${policiesToCreate.length} policies (${policiesToCreate
        .map((p) => p.id)
        .join(', ')}), updating ${policiesToUpdate.length} policies, deleting ${
        uniqueToDelete.length
      } policies (${uniqueToDelete.join(', ')})`
    );

    const createResponse = await this.packagePolicyService.bulkCreate({
      newPolicies: policiesToCreate,
      spaceId,
    });

    if (createResponse.failed.length > 0) {
      this.server.logger.error(
        `[editingMonitors] Failed to create ${
          createResponse.failed.length
        } package policies: ${JSON.stringify(
          createResponse.failed.map(({ packagePolicy, error }) => ({
            id: (packagePolicy as NewPackagePolicyWithId).id,
            error: error?.message ?? error,
          }))
        )}`
      );
    }

    const [failedUpdatesRes] = await Promise.all([
      this.packagePolicyService.bulkUpdate({
        policiesToUpdate,
        spaceId,
      }),
      this.packagePolicyService.bulkDelete({
        policyIdsToDelete: uniqueToDelete,
        spaceId,
      }),
    ]);

    const failedUpdates = failedUpdatesRes?.map(({ packagePolicy, error }) => {
      const policyConfig = configs.find(({ config }) => {
        const { locations } = config;

        const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);
        for (const privateLocation of monitorPrivateLocations) {
          const currId = this.getPolicyId(config, privateLocation.id);
          return currId === packagePolicy.id;
        }
      });
      return {
        error,
        packagePolicy,
        config: policyConfig?.config,
      };
    });

    return {
      failedUpdates,
      failedCreates: createResponse.failed,
    };
  }

  /**
   * Idempotent, minimal-churn rebalance for a scalable (condition-sharded)
   * private location.
   *
   * Every monitor is pinned to the location's single agent policy; distribution
   * is expressed as a per-monitor host condition. This reads each monitor's
   * current pin, runs the {@link rebalanceByCost} placement pass (failover of
   * stale-host monitors + cost load-balancing onto stability-gated recovery
   * hosts, moving nothing else), and rewrites only the conditions of monitors
   * whose host actually changed. It reuses the existing package-policy content
   * and flips only `condition` — it never decrypts or regenerates monitor
   * configs like {@link editMonitors}. Steady state performs zero writes.
   *
   * `recoveryHosts` (a stability-gated subset of `healthyHosts`) are the only
   * hosts eligible to *receive* load-balancing moves; failover of a dead agent's
   * monitors ignores this and uses the full live `healthyHosts`, so a flapping
   * agent can't repeatedly pull load onto itself while a dead agent's monitors
   * still evacuate immediately.
   */
  async rebalanceShards({
    location,
    healthyHosts,
    recoveryHosts,
    capacities,
    hostIds,
  }: {
    location: { id: string; label?: string };
    /** Host names of agents that have checked in recently. */
    healthyHosts: string[];
    /** Subset of `healthyHosts` eligible to *receive* recovery redistribution
     * (anti-flap hysteresis — a freshly recovered host is excluded until it has
     * proven stable). Defaults to `healthyHosts`. Failover ignores this. */
    recoveryHosts?: string[];
    /** Per-host capacity weight (total RAM in MiB) for cost-balanced recovery, so
     * bigger agents take proportionally more load. Hosts missing an entry fall
     * back to uniform capacity. */
    capacities?: ReadonlyMap<string, number>;
    /** Host name → `host.id`, so a rewritten condition pins uniquely on both
     * (guards against two agents sharing a hostname). */
    hostIds?: ReadonlyMap<string, string>;
  }): Promise<{ total: number; moved: number }> {
    if (healthyHosts.length === 0) {
      return { total: 0, moved: 0 };
    }
    const pkgPolicies = await this.packagePolicyService.listByLocation({
      locationId: location.id,
    });
    const totalMonitors = pkgPolicies.length;
    if (totalMonitors === 0) {
      return { total: 0, moved: 0 };
    }

    // The config id is the part before `-${locationId}`; using indexOf (not a
    // fixed trailing strip) also handles legacy space-suffixed ids
    // (`${configId}-${locationId}-${spaceId}`) where the location id is an infix.
    const marker = `-${location.id}`;
    const configIdOf = (policyId: string): string => {
      const idx = policyId.indexOf(marker);
      return idx > 0 ? policyId.slice(0, idx) : '';
    };

    // Current placement: monitor id, memory cost and its current host pin (from
    // the package-policy condition). A single minimal-churn pass then computes
    // the target host per monitor — failing over stale-host monitors and load-
    // balancing onto recovery hosts, moving nothing else.
    //
    // A monitor can have both a new-format (`${configId}-${locationId}`) and a
    // legacy space-suffixed (`${configId}-${locationId}-${spaceId}`) package
    // policy; dedupe by config id so its cost isn't counted twice and the
    // balancer isn't skewed.
    const monitorsById = new Map<string, { id: string; cost: number; currentHost?: string }>();
    for (const pp of pkgPolicies) {
      const id = configIdOf(pp.id);
      if (!id || monitorsById.has(id)) {
        continue;
      }
      monitorsById.set(id, {
        id,
        cost: getMonitorCostMib(monitorTypeOfPolicy(pp)),
        currentHost: hostFromCondition(pp.condition),
      });
    }
    const assignment = rebalanceByCost([...monitorsById.values()], healthyHosts, {
      capacities,
      recoveryHosts,
    });

    const updatesBySpace = new Map<string, UpdatePackagePolicyWithId[]>();

    for (const pp of pkgPolicies) {
      const monitorId = configIdOf(pp.id);
      if (!monitorId) {
        continue;
      }

      const desiredHost = assignment.get(monitorId);
      if (!desiredHost) {
        continue; // unplaceable → no write
      }
      // Compare the full condition (host.name AND host.id): if the assigned
      // agent kept its hostname but got a new host.id (e.g. a rebuilt VM/
      // container reusing the name), the name alone is unchanged but the pin is
      // stale and must be rewritten — otherwise the monitor runs on no agent.
      const desiredCondition = hostNameCondition(desiredHost, hostIds?.get(desiredHost));
      if (pp.condition === desiredCondition) {
        continue; // already pinned to the right agent → no write
      }

      const spaceId = pp.spaceIds?.[0] ?? DEFAULT_SPACE_ID;
      const updates = updatesBySpace.get(spaceId) ?? [];
      updates.push(toConditionUpdate(pp, desiredCondition));
      updatesBySpace.set(spaceId, updates);
    }

    let moved = 0;
    for (const [spaceId, policiesToUpdate] of updatesBySpace) {
      const failed = await this.packagePolicyService.bulkUpdate({ policiesToUpdate, spaceId });
      // Count only successful moves (a failed bulkUpdate leaves the old pin).
      moved += policiesToUpdate.length - failed.length;
      if (failed.length > 0) {
        this.server.logger.error(
          `[rebalanceShards] Failed to move ${failed.length} monitors for location ${
            location.label ?? location.id
          }`
        );
      }
    }

    return { total: totalMonitors, moved };
  }

  /**
   * Fetches existing package policies for the given configs and locations.
   * Looks for new (space-agnostic) format and legacy format for all spaces
   * that have any synthetics monitors.
   */
  async getExistingPolicies(
    configs: HeartbeatConfig[],
    allPrivateLocations: SyntheticsPrivateLocations,
    spaceId: string
  ) {
    const allSpacesWithMonitors = await this.getAllSpacesWithMonitors();
    const allSpaces = new Set([spaceId, ...allSpacesWithMonitors]);
    const policyIdsToFetch = new Set<string>();

    for (const config of configs) {
      for (const privateLocation of allPrivateLocations) {
        policyIdsToFetch.add(this.getPolicyId(config, privateLocation.id));
        this.getLegacyPolicyIdsForAllSpaces(config.id, privateLocation.id, allSpaces).forEach(
          (id) => policyIdsToFetch.add(id)
        );
      }
    }

    const policies = await this.packagePolicyService.getByIds({
      spaceId,
      packagePolicyIds: Array.from(policyIdsToFetch),
    });

    return { policies, allSpaces };
  }

  async deleteMonitors(configs: HeartbeatConfig[], spaceId: string) {
    const allSpacesWithMonitors = await this.getAllSpacesWithMonitors();
    const allSpaces = new Set([spaceId, ...allSpacesWithMonitors]);

    const policyIdsToFetch = new Set<string>();
    for (const config of configs) {
      const monitorPrivateLocations = config.locations.filter((loc) => !loc.isServiceManaged);
      for (const privateLocation of monitorPrivateLocations) {
        policyIdsToFetch.add(this.getPolicyId(config, privateLocation.id));
        this.getLegacyPolicyIdsForAllSpaces(config.id, privateLocation.id, allSpaces).forEach(
          (id) => policyIdsToFetch.add(id)
        );
      }
    }

    const existingPolicies = await this.packagePolicyService.getByIds({
      spaceId,
      packagePolicyIds: Array.from(policyIdsToFetch),
    });

    const policyIdsToDelete = new Set<string>();
    for (const config of configs) {
      const monitorPrivateLocations = config.locations.filter((loc) => !loc.isServiceManaged);
      for (const privateLocation of monitorPrivateLocations) {
        const { hasNewFormatPolicyId, legacyPolicyIds } = this.getPolicyIdFormatInfo(
          config,
          privateLocation.id,
          existingPolicies,
          allSpaces
        );
        if (hasNewFormatPolicyId) {
          policyIdsToDelete.add(this.getPolicyId(config, privateLocation.id));
        }
        legacyPolicyIds.forEach((id) => policyIdsToDelete.add(id));
      }
    }

    if (policyIdsToDelete.size > 0) {
      const result = await this.packagePolicyService.bulkDelete({
        policyIdsToDelete: Array.from(policyIdsToDelete),
        spaceId,
      });
      const failedPolicies = result?.filter((policy) => {
        return policy && !policy.success && policy?.statusCode !== 404;
      });
      if (failedPolicies?.length === policyIdsToDelete.size) {
        throw new Error(deletePolicyError(configs[0][ConfigKey.NAME]));
      }
      return result;
    }
  }

  async getAgentPolicies() {
    return getAgentPoliciesAsInternalUser({ server: this.server, spaceId: ALL_SPACES_ID });
  }
}

/**
 * Monitor type of a synthetics package policy, read from its single enabled
 * input (`synthetics/${type}`). Only `browser` vs. lightweight matters for the
 * memory cost model, so anything non-browser is treated as lightweight.
 */
const monitorTypeOfPolicy = (pp: PackagePolicy): 'browser' | 'http' =>
  pp.inputs?.some((input) => input.enabled && input.type === 'synthetics/browser')
    ? 'browser'
    : 'http';

/**
 * Builds a minimal update payload that only re-targets a package policy to a
 * different agent by rewriting its `${host.name}` condition. It carries over the
 * existing content (inputs/vars/package) and single-policy binding unchanged and
 * drops saved-object metadata Fleet recomputes on update, so the compiled config
 * stays identical and only the runtime host condition changes.
 */
const toConditionUpdate = (pp: PackagePolicy, condition: string): UpdatePackagePolicyWithId => ({
  id: pp.id,
  name: pp.name,
  description: pp.description,
  namespace: pp.namespace,
  enabled: pp.enabled,
  is_managed: pp.is_managed,
  package: pp.package,
  inputs: pp.inputs,
  vars: pp.vars,
  output_id: pp.output_id,
  supports_agentless: pp.supports_agentless,
  global_data_tags: pp.global_data_tags,
  elasticsearch: pp.elasticsearch,
  overrides: pp.overrides,
  additional_datastreams_permissions: pp.additional_datastreams_permissions,
  policy_id: pp.policy_id,
  policy_ids: pp.policy_ids,
  condition,
});

const throwAddEditError = (hasPolicy: boolean, location?: string, name?: string) => {
  throw new Error(
    `Unable to ${hasPolicy ? 'update' : 'create'} Synthetics package policy ${
      name ? 'for monitor ' + name : ''
    } for private location: ${location}`
  );
};

const deletePolicyError = (name: string, location?: string) => {
  return `Unable to delete Synthetics package policy for monitor ${name} with private location ${location}`;
};
