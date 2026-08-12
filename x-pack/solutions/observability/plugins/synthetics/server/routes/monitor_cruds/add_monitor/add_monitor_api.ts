/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import { isValidNamespace } from '@kbn/fleet-plugin/common';
import { getPackagePolicySavedObjectType } from '@kbn/fleet-plugin/server/services/package_policy';
import { i18n } from '@kbn/i18n';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorAttributes,
  syntheticsMonitorSavedObjectType,
} from '../../../../common/types/saved_objects';
import { DeleteMonitorAPI } from '../services/delete_monitor_api';
import { PackagePolicyService } from '../../../synthetics_service/private_location/package_policy_service';
import { parseMonitorLocations } from './utils';
import { MonitorValidationError } from '../monitor_validation';
import { getSavedObjectKqlFilter } from '../../common';
import type { PrivateLocationAttributes } from '../../../runtime_types/private_locations';
import { ConfigKey } from '../../../../common/constants/monitor_management';
import type {
  EncryptedSyntheticsMonitorAttributes,
  MonitorFields,
  ServiceLocations,
  SyntheticsMonitor,
} from '../../../../common/runtime_types';
import { MonitorTypeEnum } from '../../../../common/runtime_types';
import {
  getMaxAttempts,
  getMonitorLocations,
  getMonitorSchedule,
} from '../../../synthetics_service/project_monitor/normalizers/common_fields';
import {
  DEFAULT_FIELDS,
  DEFAULT_NAMESPACE_STRING,
} from '../../../../common/constants/monitor_defaults';
import { triggerTestNow } from '../../synthetics_service/test_now_monitor';
import { DefaultRuleService } from '../../default_alerts/default_alert_service';
import type { RouteContext } from '../../types';
import { formatTelemetryEvent, sendTelemetryEvents } from '../../telemetry/monitor_upgrade_sender';
import { formatKibanaNamespace } from '../../../../common/formatters';
import { getPrivateLocationsForNamespaces } from '../../../synthetics_service/get_private_locations';
import { resolveMaintenanceWindowsOrThrow } from '../../../synthetics_service/maintenance_windows/resolve_maintenance_windows';

export type CreateMonitorPayLoad = MonitorFields & {
  url?: string;
  host?: string;
  locations?: string[] | ServiceLocations;
  private_locations?: string[] | PrivateLocationAttributes[];
  schedule?: number | MonitorFields['schedule'];
};

export class AddEditMonitorAPI {
  routeContext: RouteContext;
  allPrivateLocations?: PrivateLocationAttributes[];
  constructor(routeContext: RouteContext) {
    this.routeContext = routeContext;
  }

  async syncNewMonitor({
    id,
    normalizedMonitor,
    savedObjectType,
  }: {
    id?: string;
    normalizedMonitor: SyntheticsMonitor;
    savedObjectType?: string;
  }) {
    const { server, syntheticsMonitorClient, spaceId } = this.routeContext;
    const newMonitorId = id ?? uuidV4();

    let monitorSavedObject: SavedObject<EncryptedSyntheticsMonitorAttributes> | null = null;
    const monitorWithNamespace = this.hydrateMonitorFields({
      normalizedMonitor,
      newMonitorId,
    });

    const monitorPrivateLocations = monitorWithNamespace[ConfigKey.LOCATIONS].filter(
      (loc) => !loc.isServiceManaged
    );
    // Deterministic package-policy ids for this monitor's private locations. Used both
    // for the SO references below and to force-clean orphans on a failed create.
    const packagePolicyIds = monitorPrivateLocations.map((loc) => `${newMonitorId}-${loc.id}`);

    // Whether *this* call actually created the monitor SO. Rollback must only
    // delete the SO when we own it — a `version_conflict` on create means an SO
    // with this id already existed and must not be torn down by us.
    let soCreated = false;

    try {
      const packagePolicySoType = await getPackagePolicySavedObjectType();
      const references = monitorPrivateLocations.map((loc) => ({
        id: `${newMonitorId}-${loc.id}`,
        name: `${newMonitorId}-${loc.id}`,
        type: packagePolicySoType,
      }));

      const newMonitorPromise = this.routeContext.monitorConfigRepository.create({
        normalizedMonitor: monitorWithNamespace,
        id: newMonitorId,
        spaceId,
        savedObjectType,
        references: references.length > 0 ? references : undefined,
      });

      const syncErrorsPromise = syntheticsMonitorClient.addMonitors(
        [{ monitor: monitorWithNamespace as MonitorFields, id: newMonitorId }],
        this.allPrivateLocations ?? [],
        spaceId
      );

      // allSettled (not Promise.all) so a rejection on one side doesn't leave the
      // other's outcome unobserved — we need to know whether the SO was created to
      // roll back correctly.
      const [soResult, syncResult] = await Promise.allSettled([
        newMonitorPromise,
        syncErrorsPromise,
      ]);
      soCreated = soResult.status === 'fulfilled';

      if (soResult.status === 'rejected') {
        throw soResult.reason;
      }
      if (syncResult.status === 'rejected') {
        throw syncResult.reason;
      }

      const [packagePolicyResult, syncErrors] = syncResult.value;
      if ((packagePolicyResult?.failed?.length ?? 0) > 0) {
        const failed = packagePolicyResult.failed.map((f) => f.error);
        throw new Error(failed.join(', '));
      }

      monitorSavedObject = soResult.value;

      sendTelemetryEvents(
        server.logger,
        server.telemetry,
        formatTelemetryEvent({
          errors: syncErrors,
          monitor: monitorSavedObject,
          isInlineScript: Boolean((normalizedMonitor as MonitorFields)[ConfigKey.SOURCE_INLINE]),
          stackVersion: server.stackVersion,
        })
      );

      return {
        errors: syncErrors,
        newMonitor: {
          ...monitorSavedObject,
          attributes: { ...monitorWithNamespace, ...monitorSavedObject.attributes },
        },
      };
    } catch (e) {
      e.message = `${e.message}, monitor name: ${monitorWithNamespace[ConfigKey.NAME]}`;
      await this.revertMonitorIfCreated({
        newMonitorId,
        packagePolicyIds,
        soCreated,
      });

      throw e;
    }
  }

  validateMonitorType(monitorFields: MonitorFields, previousMonitor?: MonitorFields) {
    const { [ConfigKey.MONITOR_TYPE]: monitorType } = monitorFields;
    if (previousMonitor) {
      const { [ConfigKey.MONITOR_TYPE]: prevMonitorType } = previousMonitor;

      if (monitorType !== prevMonitorType) {
        // monitor type cannot be changed
        throw new MonitorValidationError({
          valid: false,
          reason: i18n.translate('xpack.synthetics.createMonitor.validation.monitorTypeChanged', {
            defaultMessage:
              'Monitor type cannot be changed from {prevMonitorType} to {monitorType}.',
            values: {
              prevMonitorType,
              monitorType,
            },
          }),
          details: '',
          payload: monitorFields,
        });
      }
    }
  }

  async normalizeMonitor(
    requestPayload: CreateMonitorPayLoad,
    monitorPayload: CreateMonitorPayLoad,
    prevLocations?: MonitorFields['locations'],
    maintenanceWindows: MaintenanceWindow[] = []
  ) {
    const { syntheticsMonitorClient, request } = this.routeContext;
    const internal = Boolean((request.query as { internal?: boolean })?.internal);
    const {
      locations,
      private_locations: privateLocations,
      schedule,
      retest_on_failure: retestOnFailure,
      url: rawUrl,
      host: rawHost,
      ...rest
    } = requestPayload;
    const monitor = rest as MonitorFields;

    const monitorType = monitor[ConfigKey.MONITOR_TYPE];
    if (monitorType === MonitorTypeEnum.HTTP && !monitor.name) {
      monitor.name = monitor.urls;
    }

    const defaultFields = DEFAULT_FIELDS[monitorType];

    const maintenanceWindowRefs = monitor[ConfigKey.MAINTENANCE_WINDOWS];
    let resolvedMaintenanceWindows = maintenanceWindowRefs;
    if (maintenanceWindowRefs && maintenanceWindowRefs.length > 0) {
      resolvedMaintenanceWindows = resolveMaintenanceWindowsOrThrow(
        maintenanceWindowRefs,
        maintenanceWindows
      );
    }

    let locationsVal: MonitorFields['locations'] = [];

    if (!locations && !privateLocations && prevLocations) {
      locationsVal = prevLocations;

      const prevPrivateLocations = prevLocations.filter((loc) => !loc.isServiceManaged);
      if (prevPrivateLocations.length > 0) {
        const monitorSpaces = monitor[ConfigKey.KIBANA_SPACES] ?? [];
        const namespacesForLookup = [
          ...new Set([this.routeContext.spaceId, ...monitorSpaces]),
        ].filter(Boolean);
        const internalClient =
          this.routeContext.server.coreStart.savedObjects.createInternalRepository();
        this.allPrivateLocations = await getPrivateLocationsForNamespaces(
          internalClient,
          namespacesForLookup
        );
      }
    } else {
      const monitorLocations = parseMonitorLocations(monitorPayload, prevLocations, internal);

      if (monitorLocations.privateLocations.length > 0) {
        const monitorSpaces = monitor[ConfigKey.KIBANA_SPACES] ?? [];
        const namespacesForLookup = [
          ...new Set([this.routeContext.spaceId, ...monitorSpaces]),
        ].filter(Boolean);
        const internalClient =
          this.routeContext.server.coreStart.savedObjects.createInternalRepository();
        this.allPrivateLocations = await getPrivateLocationsForNamespaces(
          internalClient,
          namespacesForLookup
        );
      } else {
        this.allPrivateLocations = [];
      }

      locationsVal = getMonitorLocations({
        monitorLocations,
        allPublicLocations: syntheticsMonitorClient.syntheticsService.locations,
        allPrivateLocations: this.allPrivateLocations,
      });
    }

    return {
      ...DEFAULT_FIELDS[monitorType],
      ...monitor,
      [ConfigKey.SCHEDULE]: getMonitorSchedule(schedule ?? defaultFields[ConfigKey.SCHEDULE]),
      [ConfigKey.MAX_ATTEMPTS]: getMaxAttempts(retestOnFailure, monitor[ConfigKey.MAX_ATTEMPTS]),
      [ConfigKey.LOCATIONS]: locationsVal,
      [ConfigKey.MAINTENANCE_WINDOWS]:
        resolvedMaintenanceWindows ?? defaultFields?.[ConfigKey.MAINTENANCE_WINDOWS] ?? [],
    } as MonitorFields;
  }

  async validateUniqueMonitorName(name: string, id?: string) {
    const { monitorConfigRepository } = this.routeContext;
    const kqlFilter = getSavedObjectKqlFilter({ field: 'name.keyword', values: name });
    const { total } = await monitorConfigRepository.find({
      perPage: 0,
      filter: id
        ? `${kqlFilter} and not (${syntheticsMonitorAttributes}.config_id: ${id})`
        : kqlFilter,
    });

    if (total > 0) {
      return i18n.translate('xpack.synthetics.createMonitor.validation.uniqueName', {
        defaultMessage: 'Monitor name must be unique, "{name}" already exists.',
        values: { name },
      });
    }
  }

  initDefaultAlerts(name: string) {
    const { server, savedObjectsClient, context } = this.routeContext;

    try {
      // we do this async, so we don't block the user, error handling will be done on the UI via separate api
      const defaultAlertService = new DefaultRuleService(context, server, savedObjectsClient);
      defaultAlertService
        .setupDefaultRules()
        .then(() => {
          server.logger.debug(`Successfully created default alert for monitor: ${name}`);
        })
        .catch((error) => {
          server.logger.error(`Error creating default alert: ${error} for monitor: ${name}`, {
            error,
          });
        });
    } catch (error) {
      server.logger.error(`Error creating default alert: ${error} for monitor: ${name}`, { error });
    }
  }

  setupGettingStarted = (configId: string) => {
    const { server, request } = this.routeContext;

    try {
      const { gettingStarted } = request.query;

      if (gettingStarted) {
        // ignore await, since we don't want to block the response
        triggerTestNow(configId, this.routeContext)
          .then(() => {
            server.logger.debug(`Successfully triggered test for monitor: ${configId}`);
          })
          .catch((error) => {
            server.logger.error(
              `Error triggering test for monitor: ${configId}, Error: ${error.message}`,
              {
                error,
              }
            );
          });
      }
    } catch (error) {
      server.logger.error(`Error triggering test for getting started monitor: ${configId}`, {
        error,
      });
    }
  };

  hydrateMonitorFields({
    newMonitorId,
    normalizedMonitor,
  }: {
    newMonitorId: string;
    normalizedMonitor: SyntheticsMonitor;
  }) {
    const { request } = this.routeContext;

    const { preserve_namespace: preserveNamespace } = request.query as Record<
      string,
      { preserve_namespace?: boolean }
    >;
    return {
      ...normalizedMonitor,
      [ConfigKey.MONITOR_QUERY_ID]:
        normalizedMonitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || newMonitorId,
      [ConfigKey.CONFIG_ID]: newMonitorId,
      [ConfigKey.NAMESPACE]: preserveNamespace
        ? normalizedMonitor[ConfigKey.NAMESPACE]
        : this.getMonitorNamespace(normalizedMonitor[ConfigKey.NAMESPACE]),
    };
  }

  getMonitorNamespace(configuredNamespace: string) {
    const { spaceId } = this.routeContext;
    const kibanaNamespace = formatKibanaNamespace(spaceId);
    const namespace =
      configuredNamespace === DEFAULT_NAMESPACE_STRING ? kibanaNamespace : configuredNamespace;
    const { error } = isValidNamespace(namespace);
    if (error) {
      throw new Error(`Cannot save monitor. Monitor namespace is invalid: ${error}`);
    }
    return namespace;
  }

  /**
   * Best-effort rollback of a partially-created monitor. Creation writes the monitor
   * saved object and its Fleet package policies concurrently, so a mid-flight failure
   * (e.g. an agent-policy `version_conflict` under load) can leave *either* side
   * stranded. We therefore clean both independently:
   *  1. delete the monitor SO (and its service/package deployment) — but only when
   *     *this* call created it (`soCreated`), so a create that failed with a
   *     conflict against a pre-existing SO of the same id never tears that SO down;
   *  2. force-delete the deterministic private-location package policy ids, so a
   *     package policy created while the SO write lost the race can't survive as an
   *     orphan (which would inflate the location's assignment count and never get
   *     GC'd except by the one-shot `_cleanup`) — but skip this when a pre-existing
   *     monitor owns that id (a `version_conflict`), since those package policies
   *     belong to it and must not be deleted.
   * Each step is isolated so one failure doesn't skip the other.
   */
  async revertMonitorIfCreated({
    newMonitorId,
    packagePolicyIds = [],
    soCreated = true,
  }: {
    newMonitorId: string;
    packagePolicyIds?: string[];
    /** Only true when this call's SO create succeeded; guards against deleting a
     * foreign SO that already existed under the same id. */
    soCreated?: boolean;
  }) {
    const { server, spaceId, monitorConfigRepository } = this.routeContext;

    try {
      const encryptedMonitor = soCreated ? await monitorConfigRepository.get(newMonitorId) : null;
      if (encryptedMonitor) {
        // Delete via the API while the SO still exists so its package policies and
        // any service-managed deployment are torn down too, then hard-delete the SO.
        const deleteMonitorAPI = new DeleteMonitorAPI(this.routeContext);
        await deleteMonitorAPI.execute({ monitorIds: [newMonitorId] });
        await monitorConfigRepository.bulkDelete([
          { id: newMonitorId, type: syntheticsMonitorSavedObjectType },
          { id: newMonitorId, type: legacySyntheticsMonitorTypeSingle },
        ]);
      }
    } catch (error) {
      server.logger.error(
        `Unable to revert monitor saved object with id ${newMonitorId}, Error: ${error.message}`,
        { error }
      );
    }

    // Safety net for the orphan case: force-delete this monitor's deterministic
    // package-policy ids so a package policy created while the SO write lost the
    // race can't survive unreferenced. But a `version_conflict` means an SO — and
    // its same-id package policies — already existed and belong to ANOTHER
    // monitor; force-deleting those would break it. So when we didn't create the
    // SO, only clean up if no monitor currently owns that id.
    if (packagePolicyIds.length > 0) {
      const ownedByExistingMonitor =
        !soCreated && Boolean(await monitorConfigRepository.get(newMonitorId).catch(() => null));
      if (!ownedByExistingMonitor) {
        try {
          await new PackagePolicyService(server).bulkDelete({
            policyIdsToDelete: packagePolicyIds,
            spaceId,
          });
        } catch (error) {
          server.logger.error(
            `Unable to revert package policies [${packagePolicyIds.join(
              ', '
            )}] for monitor with id ${newMonitorId}, Error: ${error.message}`,
            { error }
          );
        }
      }
    }
  }
}
