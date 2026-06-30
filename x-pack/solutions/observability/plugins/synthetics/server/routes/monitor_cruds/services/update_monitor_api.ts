/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pre-processing service for the bulk update endpoint
 * (`PUT /api/synthetics/monitors/_bulk_update`).
 *
 * Mirrors the per-monitor pipeline that `editSyntheticsMonitorRoute` runs
 * for a single PUT, but produces a list of "survivors" and a per-id error
 * map so the route handler can hand survivors to `syncEditedMonitorBulk`
 * in one batch (Step 3 wires that up).
 *
 * Input is a list of `{ id, attributes }` updates; each id is merged with
 * its own partial `attributes` patch, so one request can apply a different
 * change per monitor.
 *
 * Pipeline per monitor id:
 *   1. Bulk decrypt (single round-trip via `findDecryptedMonitors`)
 *   2. `not_found` diff for ids missing from the result set
 *   3. Reject project-origin monitors (Option A — see kibana-34 bead)
 *   4. `mergeSourceMonitor` (deep-merge METADATA, shallow-merge ALERT_CONFIG,
 *      everything else overwrites) — this is what re-builds the AAD-bound
 *      attribute set so `syncEditedMonitorBulk` can re-encrypt safely
 *   5. `normalizeAPIConfig` on the merged payload to reject unknown/unsupported
 *      keys (mirrors the single-monitor PUT; io-ts `t.exact` would otherwise
 *      silently strip them)
 *   6. io-ts validation via `validateMonitor` on the merged payload
 *   7. Per-monitor permission checks (Elastic-managed locations + multi-space
 *      bulk_update privilege)
 *   8. Bump revision, reset CONFIG_HASH, run `formatSecrets` to produce the
 *      `monitorWithRevision` shape `syncEditedMonitorBulk` expects
 *
 * Survivors are the input shape for `syncEditedMonitorBulk` (see
 * `MonitorConfigUpdate` in `bulk_cruds/edit_monitor_bulk.ts`).
 */

import type { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { i18n } from '@kbn/i18n';
import { getSavedObjectKqlFilter } from '../../common';
import type { MonitorConfigUpdate } from '../bulk_cruds/edit_monitor_bulk';
import { mergeSourceMonitor } from '../formatters/saved_object_to_monitor';
import {
  assertCanUpdateMonitorInAllSpaces,
  validateMonitorPrivateLocationSpaces,
} from '../monitor_locations_utils';
import { normalizeAPIConfig, validateMonitor } from '../monitor_validation';
import { AddEditMonitorAPI, type CreateMonitorPayLoad } from '../add_monitor/add_monitor_api';
import { validateLocationPermissions } from '../edit_monitor';
import { ELASTIC_MANAGED_LOCATIONS_DISABLED } from '../project_monitor/add_monitor_project';
import type { RouteContext } from '../../types';
import {
  ConfigKey,
  type EncryptedSyntheticsMonitor,
  type MonitorFields,
  type SyntheticsMonitor,
  type SyntheticsMonitorWithSecretsAttributes,
  type SyntheticsPrivateLocations,
} from '../../../../common/runtime_types';
import { formatSecrets, normalizeSecrets } from '../../../synthetics_service/utils/secrets';

export type UpdateMonitorErrorCode =
  | 'not_found'
  | 'invalid_origin'
  | 'validation_failed'
  | 'forbidden';

export interface UpdateMonitorPerIdError {
  code: UpdateMonitorErrorCode;
  message: string;
  details?: string;
}

export interface UpdateMonitorPreprocessResult {
  survivors: MonitorConfigUpdate[];
  perIdErrors: Record<string, UpdateMonitorPerIdError>;
}

/** A single entry of the bulk update request: which monitor, and its patch. */
export interface MonitorBulkUpdate {
  id: string;
  attributes: Partial<EncryptedSyntheticsMonitor>;
}

interface ExecuteParams {
  updates: MonitorBulkUpdate[];
}

export class UpdateMonitorAPI {
  routeContext: RouteContext;
  result: UpdateMonitorPreprocessResult = { survivors: [], perIdErrors: {} };
  private namePatchErrors = new Map<string, string>();

  /*
   * Request-scoped permission caches. A new instance is created per request,
   * so these turn the previous per-monitor permission round-trips into a
   * single resolution (capabilities) / one-per-distinct-space-set (privileges).
   */
  private locationPermissionsPromise?: ReturnType<typeof validateLocationPermissions>;
  private readonly spacePermissionCache = new Map<
    string,
    ReturnType<typeof assertCanUpdateMonitorInAllSpaces>
  >();

  constructor(routeContext: RouteContext) {
    this.routeContext = routeContext;
  }

  async execute({ updates }: ExecuteParams): Promise<UpdateMonitorPreprocessResult> {
    const ids = updates.map((update) => update.id);
    const patchById = new Map<string, Partial<EncryptedSyntheticsMonitor>>(
      updates.map((update) => [update.id, update.attributes])
    );
    this.namePatchErrors = await this.validateNamePatches(updates);

    const decryptedMonitors = await this.findDecryptedMonitors(ids);
    this.markNotFound(ids, decryptedMonitors);

    for (const decryptedMonitor of decryptedMonitors) {
      const patch = patchById.get(decryptedMonitor.id) ?? {};
      await this.processMonitor(decryptedMonitor, patch);
    }

    return this.result;
  }

  /**
   * Single decrypt round-trip. Uses a CONFIG_ID-based KQL filter so the SO
   * client can fetch every requested monitor in one call (vs. the per-id
   * loop that `ResetMonitorAPI` and `DeleteMonitorAPI` use). This is the
   * main reason this endpoint scales better than calling PUT N times.
   */
  private async findDecryptedMonitors(
    ids: string[]
  ): Promise<Array<SavedObjectsFindResult<SyntheticsMonitorWithSecretsAttributes>>> {
    const { monitorConfigRepository, spaceId } = this.routeContext;
    const filter = getSavedObjectKqlFilter({
      field: ConfigKey.CONFIG_ID,
      values: ids,
    });
    return monitorConfigRepository.findDecryptedMonitors({ spaceId, filter });
  }

  private markNotFound(
    ids: string[],
    decryptedMonitors: Array<SavedObjectsFindResult<SyntheticsMonitorWithSecretsAttributes>>
  ) {
    const foundIds = new Set(decryptedMonitors.map((m) => m.id));
    for (const id of ids) {
      if (!foundIds.has(id)) {
        this.result.perIdErrors[id] = {
          code: 'not_found',
          message: notFoundMessage(id),
        };
      }
    }
  }

  private async processMonitor(
    decryptedMonitor: SavedObjectsFindResult<SyntheticsMonitorWithSecretsAttributes>,
    patch: Partial<EncryptedSyntheticsMonitor>
  ) {
    const monitorId = decryptedMonitor.id;

    if (this.shouldRejectProjectMonitor(decryptedMonitor.attributes)) {
      this.result.perIdErrors[monitorId] = {
        code: 'invalid_origin',
        message: invalidOriginMessage(decryptedMonitor.attributes[ConfigKey.MONITOR_SOURCE_TYPE]),
      };
      return;
    }

    const { prevAttrs, merged } = this.mergePatch(decryptedMonitor, patch);

    const nameError = this.namePatchErrors.get(monitorId);
    if (nameError) {
      this.result.perIdErrors[monitorId] = {
        code: 'validation_failed',
        message: nameError,
      };
      return;
    }

    // Reject unknown/unsupported keys, matching the single-monitor PUT
    // (`editSyntheticsMonitorRoute`). Without this, io-ts `t.exact` in
    // `validateMonitor` would silently strip them instead of failing.
    const { errorMessage: unsupportedKeysError, formattedConfig } = normalizeAPIConfig(
      merged as CreateMonitorPayLoad
    );
    if (unsupportedKeysError) {
      this.result.perIdErrors[monitorId] = {
        code: 'validation_failed',
        message: unsupportedKeysError,
      };
      return;
    }

    const editMonitorAPI = new AddEditMonitorAPI(this.routeContext);
    let normalizedMonitor: MonitorFields;
    try {
      editMonitorAPI.validateMonitorType(merged as MonitorFields, prevAttrs as MonitorFields);
      normalizedMonitor = await editMonitorAPI.normalizeMonitor(
        (formattedConfig ?? merged) as CreateMonitorPayLoad,
        patch as CreateMonitorPayLoad,
        (prevAttrs as MonitorFields)[ConfigKey.LOCATIONS]
      );
    } catch (error) {
      this.result.perIdErrors[monitorId] = {
        code: 'validation_failed',
        message: getErrorMessage(error),
      };
      return;
    }

    const validation = validateMonitor(normalizedMonitor, this.routeContext.spaceId);
    if (!validation.valid || !validation.decodedMonitor) {
      this.result.perIdErrors[monitorId] = {
        code: 'validation_failed',
        message: validation.reason,
        details: validation.details,
      };
      return;
    }
    const decodedMonitor = validation.decodedMonitor;

    const forbidden = await this.checkPermissions(decodedMonitor, decryptedMonitor.type);
    if (forbidden) {
      this.result.perIdErrors[monitorId] = forbidden;
      return;
    }

    /*
     * `normalizeMonitor` already resolved (and cached on `editMonitorAPI`) the
     * private locations covering this monitor's spaces — same fetch the
     * single-monitor PUT relies on. A public-only monitor leaves it `[]`, which
     * `checkPrivateLocationSpaces` short-circuits.
     */
    const plSpaceError = this.checkPrivateLocationSpaces(
      decodedMonitor,
      editMonitorAPI.allPrivateLocations ?? []
    );
    if (plSpaceError) {
      this.result.perIdErrors[monitorId] = plSpaceError;
      return;
    }

    this.result.survivors.push(this.buildSurvivor(decryptedMonitor, decodedMonitor, prevAttrs));
  }

  /**
   * Origin policy (Option A from the kibana-34 plan): reject anything whose
   * existing `origin` is not `'ui'`. Mirrors the single-PUT precedent at
   * `edit_monitor.ts` line 103. If/when we flip to Option B (allow patches
   * limited to "sticky" project-monitor fields like `enabled`), this is the
   * single seam to extend — accept the patch on the same predicate that
   * `ProjectMonitorFormatter` uses to skip overwriting on the next CLI push.
   */
  private shouldRejectProjectMonitor(prevAttrs: SyntheticsMonitorWithSecretsAttributes): boolean {
    return prevAttrs[ConfigKey.MONITOR_SOURCE_TYPE] !== 'ui';
  }

  /**
   * Decrypt the previous attributes back into monitor shape (so secrets are
   * re-merged), strip REVISION (we own that), then run `mergeSourceMonitor`
   * which knows to deep-merge METADATA / shallow-merge ALERT_CONFIG.
   *
   * Important: we do NOT call `formatSecrets` here. Validation runs on the
   * decrypted shape; `formatSecrets` happens once at the end, only for
   * survivors, in `buildSurvivor`.
   */
  private mergePatch(
    decryptedMonitor: SavedObjectsFindResult<SyntheticsMonitorWithSecretsAttributes>,
    patch: Partial<EncryptedSyntheticsMonitor>
  ): { prevAttrs: SyntheticsMonitor; merged: EncryptedSyntheticsMonitor } {
    const { attributes: prevAttrs } = normalizeSecrets(decryptedMonitor);
    const { [ConfigKey.REVISION]: _, ...prevAttrsForMerge } = prevAttrs;
    const merged = mergeSourceMonitor(
      prevAttrsForMerge as EncryptedSyntheticsMonitor,
      patch as EncryptedSyntheticsMonitor
    );
    return { prevAttrs, merged };
  }

  private async validateNamePatches(updates: MonitorBulkUpdate[]): Promise<Map<string, string>> {
    const errors = new Map<string, string>();
    const idsByName = new Map<string, string[]>();
    for (const { id, attributes } of updates) {
      const nextName = attributes[ConfigKey.NAME];
      if (typeof nextName === 'string') {
        const ids = idsByName.get(nextName);
        if (ids) {
          ids.push(id);
        } else {
          idsByName.set(nextName, [id]);
        }
      }
    }

    const namesToCheck: string[] = [];
    for (const [name, ids] of idsByName) {
      if (ids.length > 1) {
        ids.forEach((id) => errors.set(id, duplicateNamePatchMessage(name)));
      } else {
        namesToCheck.push(name);
      }
    }

    if (namesToCheck.length === 0) {
      return errors;
    }

    const { monitorConfigRepository } = this.routeContext;
    const filter = getSavedObjectKqlFilter({ field: 'name.keyword', values: namesToCheck });
    const { saved_objects: existingMonitors = [] } = await monitorConfigRepository.find({
      perPage: 500,
      filter,
    });

    for (const monitor of existingMonitors) {
      const attributes = monitor.attributes as Partial<MonitorFields>;
      const existingName = attributes[ConfigKey.NAME];
      const existingId = attributes[ConfigKey.CONFIG_ID] ?? monitor.id;
      if (typeof existingName !== 'string' || typeof existingId !== 'string') {
        continue;
      }

      const requestedIds = idsByName.get(existingName);
      if (requestedIds?.length === 1 && requestedIds[0] !== existingId) {
        errors.set(requestedIds[0], monitorNameExistsMessage(existingName));
      }
    }

    return errors;
  }

  /**
   * Per-monitor permission gate. Both underlying checks are request-scoped
   * (they depend on the caller and the target spaces, not on the individual
   * monitor), so each resolves at most once per bulk request:
   *   - Elastic-managed-locations capability: cached for the whole request
   *     via `getLocationPermissions` (the first survivor with a public
   *     location pays for `resolveCapabilities`; the rest reuse it).
   *   - Saved-objects `bulk_update` privilege: cached per unique space set
   *     via `assertCanUpdateInSpaces`.
   * This turns the previous O(N) capability/privilege calls into O(1) /
   * O(distinct space sets).
   */
  private async checkPermissions(
    decodedMonitor: SyntheticsMonitor,
    savedObjectType: string
  ): Promise<UpdateMonitorPerIdError | undefined> {
    const hasPublicLocations = (decodedMonitor.locations ?? []).some((loc) => loc.isServiceManaged);
    if (hasPublicLocations) {
      const { elasticManagedLocationsEnabled } = await this.getLocationPermissions();
      if (!elasticManagedLocationsEnabled) {
        return { code: 'forbidden', message: ELASTIC_MANAGED_LOCATIONS_DISABLED };
      }
    }

    const editedMonitorSpaces = (decodedMonitor as MonitorFields)[ConfigKey.KIBANA_SPACES] ?? [];
    if (editedMonitorSpaces.length === 0) {
      return undefined;
    }

    /*
     * `assertCanUpdateMonitorInAllSpaces` returns either `undefined` (OK) or
     * a Kibana `forbidden` response object (used by single-PUT for early
     * return). We can't propagate the response object to a per-id slot, so
     * we collapse the failure to a generic "missing space privileges"
     * message. The privilege itself was already audit-logged by core when
     * `checkSavedObjectsPrivileges` ran inside the assertion.
     */
    const spaceAuthError = await this.assertCanUpdateInSpaces(editedMonitorSpaces, savedObjectType);
    if (spaceAuthError) {
      return { code: 'forbidden', message: insufficientSpacePermissionsMessage() };
    }
    return undefined;
  }

  /**
   * Resolve (and cache) the caller's Elastic-managed-locations capability.
   * The answer is request-scoped, so we only pay for the underlying
   * `resolveCapabilities` round-trip once per bulk request.
   */
  private getLocationPermissions(): ReturnType<typeof validateLocationPermissions> {
    if (!this.locationPermissionsPromise) {
      this.locationPermissionsPromise = validateLocationPermissions(this.routeContext);
    }
    return this.locationPermissionsPromise;
  }

  /**
   * Memoize the saved-objects `bulk_update` privilege check per unique
   * `(savedObjectType, sorted space set)` key, so monitors shared to the
   * same spaces resolve to a single `checkSavedObjectsPrivileges` call.
   */
  private assertCanUpdateInSpaces(
    spaceIds: string[],
    savedObjectType: string
  ): ReturnType<typeof assertCanUpdateMonitorInAllSpaces> {
    const key = `${savedObjectType}::${[...new Set(spaceIds)].sort().join(',')}`;
    let cached = this.spacePermissionCache.get(key);
    if (!cached) {
      cached = assertCanUpdateMonitorInAllSpaces(this.routeContext, spaceIds, savedObjectType);
      this.spacePermissionCache.set(key, cached);
    }
    return cached;
  }

  private checkPrivateLocationSpaces(
    decodedMonitor: SyntheticsMonitor,
    allPrivateLocations: SyntheticsPrivateLocations
  ): UpdateMonitorPerIdError | undefined {
    if (allPrivateLocations.length === 0) {
      return undefined;
    }

    const monitorPrivateLocations = (decodedMonitor.locations ?? []).filter(
      (loc) => !loc.isServiceManaged
    );
    if (monitorPrivateLocations.length === 0) {
      return undefined;
    }

    const plSpaceError = validateMonitorPrivateLocationSpaces(
      decodedMonitor as MonitorFields,
      allPrivateLocations
    );
    if (!plSpaceError) {
      return undefined;
    }
    return { code: 'forbidden', message: plSpaceError.message };
  }

  /**
   * Build the input shape `syncEditedMonitorBulk` expects:
   *   - `normalizedMonitor`: io-ts-decoded merged monitor (no secret rewrap)
   *   - `monitorWithRevision`: same shape with `revision` bumped, `hash`
   *     reset to `''` (so the next CLI `push` re-evaluates the AAD set)
   *     and `formatSecrets` applied so secrets are wrapped back into the
   *     encrypted-attribute envelope.
   *   - `decryptedPreviousMonitor`: original decrypted SO, kept verbatim
   *     for `bulk_cruds/edit_monitor_bulk.ts` to use as rollback source.
   */
  private buildSurvivor(
    decryptedMonitor: SavedObjectsFindResult<SyntheticsMonitorWithSecretsAttributes>,
    decodedMonitor: SyntheticsMonitor,
    prevAttrs: SyntheticsMonitor
  ): MonitorConfigUpdate {
    const monitorWithRevision = formatSecrets({
      ...decodedMonitor,
      [ConfigKey.CONFIG_HASH]: '',
      [ConfigKey.REVISION]: (prevAttrs[ConfigKey.REVISION] || 0) + 1,
    });

    return {
      normalizedMonitor: decodedMonitor,
      monitorWithRevision,
      decryptedPreviousMonitor: decryptedMonitor,
    };
  }
}

const notFoundMessage = (id: string) =>
  i18n.translate('xpack.synthetics.server.bulkUpdate.notFound', {
    defaultMessage: 'Monitor id {id} not found!',
    values: { id },
  });

const invalidOriginMessage = (origin: string | undefined) =>
  i18n.translate('xpack.synthetics.server.bulkUpdate.invalidOrigin', {
    defaultMessage:
      'Monitors of origin "{origin}" cannot be edited via the bulk update API. Use the dedicated workflow for that origin instead.',
    values: { origin: origin ?? 'unknown' },
  });

const insufficientSpacePermissionsMessage = () =>
  i18n.translate('xpack.synthetics.server.bulkUpdate.forbiddenSpacePermissions', {
    defaultMessage:
      'Insufficient permissions to update this monitor in all spaces it is shared to.',
  });

const duplicateNamePatchMessage = (name: string) =>
  i18n.translate('xpack.synthetics.server.bulkUpdate.duplicateNamePatch', {
    defaultMessage:
      'Duplicate monitor name "{name}" in updates; each monitor name may appear at most once.',
    values: { name },
  });

const monitorNameExistsMessage = (name: string) =>
  i18n.translate('xpack.synthetics.server.bulkUpdate.uniqueName', {
    defaultMessage: 'Monitor name must be unique, "{name}" already exists.',
    values: { name },
  });

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
