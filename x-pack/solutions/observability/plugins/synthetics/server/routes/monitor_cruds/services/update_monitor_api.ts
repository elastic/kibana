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
 * Pipeline per monitor id:
 *   1. Bulk decrypt (single round-trip via `findDecryptedMonitors`)
 *   2. `not_found` diff for ids missing from the result set
 *   3. Reject project-origin monitors (Option A — see kibana-34 bead)
 *   4. `mergeSourceMonitor` (deep-merge METADATA, shallow-merge ALERT_CONFIG,
 *      everything else overwrites) — this is what re-builds the AAD-bound
 *      attribute set so `syncEditedMonitorBulk` can re-encrypt safely
 *   5. io-ts validation via `validateMonitor` on the merged payload
 *   6. Per-monitor permission checks (Elastic-managed locations + multi-space
 *      bulk_update privilege)
 *   7. Bump revision, reset CONFIG_HASH, run `formatSecrets` to produce the
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
import { validateMonitor } from '../monitor_validation';
import { validatePermissions } from '../edit_monitor';
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
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';

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

interface ExecuteParams {
  ids: string[];
  attributes: Partial<EncryptedSyntheticsMonitor>;
}

export class UpdateMonitorAPI {
  routeContext: RouteContext;
  result: UpdateMonitorPreprocessResult = { survivors: [], perIdErrors: {} };

  constructor(routeContext: RouteContext) {
    this.routeContext = routeContext;
  }

  async execute({ ids, attributes }: ExecuteParams): Promise<UpdateMonitorPreprocessResult> {
    const decryptedMonitors = await this.findDecryptedMonitors(ids);
    this.markNotFound(ids, decryptedMonitors);

    /*
     * Fetched once per `execute()` to avoid an SO read per monitor inside the
     * per-id loop. Skipped entirely if the patch has no chance of touching
     * private locations — most patches (e.g. `{ enabled: false }`) won't.
     */
    const allPrivateLocations = await this.maybeLoadPrivateLocations(attributes);

    for (const decryptedMonitor of decryptedMonitors) {
      await this.processMonitor(decryptedMonitor, attributes, allPrivateLocations);
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
    patch: Partial<EncryptedSyntheticsMonitor>,
    allPrivateLocations: SyntheticsPrivateLocations
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

    const validation = validateMonitor(merged as MonitorFields, this.routeContext.spaceId);
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

    const plSpaceError = this.checkPrivateLocationSpaces(decodedMonitor, allPrivateLocations);
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

  private async checkPermissions(
    decodedMonitor: SyntheticsMonitor,
    savedObjectType: string
  ): Promise<UpdateMonitorPerIdError | undefined> {
    const elasticManagedError = await validatePermissions(
      this.routeContext,
      decodedMonitor.locations
    );
    if (elasticManagedError) {
      return { code: 'forbidden', message: elasticManagedError };
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
    const spaceAuthError = await assertCanUpdateMonitorInAllSpaces(
      this.routeContext,
      editedMonitorSpaces,
      savedObjectType
    );
    if (spaceAuthError) {
      return { code: 'forbidden', message: insufficientSpacePermissionsMessage() };
    }
    return undefined;
  }

  /**
   * Pre-fetch the private location SOs only when the patch could plausibly
   * affect private-location-space coverage: either the patch references
   * `locations` directly, or it changes the spaces the monitor is shared
   * to (because that broadens the set of spaces the existing private
   * locations must already cover).
   */
  private async maybeLoadPrivateLocations(
    patch: Partial<EncryptedSyntheticsMonitor>
  ): Promise<SyntheticsPrivateLocations> {
    const touchesLocationsOrSpaces =
      patch[ConfigKey.LOCATIONS] !== undefined || patch[ConfigKey.KIBANA_SPACES] !== undefined;
    if (!touchesLocationsOrSpaces) {
      return [];
    }
    return getPrivateLocations(this.routeContext.savedObjectsClient);
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
