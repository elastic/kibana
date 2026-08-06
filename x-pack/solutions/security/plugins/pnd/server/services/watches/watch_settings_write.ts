/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * POC (watch-settings-e2e-mvp): one-store settings write path.
 * Settings live on the user-owned workflow document only — no overlay SO.
 */

import { createHash } from 'crypto';
import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowDetailDto, WorkflowYaml } from '@kbn/workflows';
import {
  parseYamlToJSONWithoutValidation,
  stringifyWorkflowDefinition,
} from '@kbn/workflows-yaml';
import {
  getCatalogYaml,
  isPrebuiltWatchId,
  PREBUILT_WATCH_CATALOG,
} from './prebuilt_watch_catalog';
import { createWatchNotFoundError } from './watch_errors';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';

export interface WatchSettingsPatch {
  enabled?: boolean;
  description?: string;
  /** Stored 1–5; UI maps three levels onto these values. */
  autonomyLevel?: number;
  /** Scheduled trigger interval, e.g. "15m" / "1h". */
  scheduleInterval?: string;
}

export interface WatchProvenance {
  originSeedId?: string;
  seedContentVersion?: number;
  /** Fingerprint of steps + trigger types at last seed/catalogue apply. */
  structuralHash?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const extractProvenance = (
  definition: WorkflowYaml | null | undefined
): WatchProvenance | undefined => {
  const raw = definition?.consts?.watch_provenance;
  if (!isRecord(raw)) return undefined;
  return {
    originSeedId: typeof raw.originSeedId === 'string' ? raw.originSeedId : undefined,
    seedContentVersion:
      typeof raw.seedContentVersion === 'number' ? raw.seedContentVersion : undefined,
    structuralHash: typeof raw.structuralHash === 'string' ? raw.structuralHash : undefined,
  };
};

/**
 * Structural fingerprint — sha256 of steps + trigger types.
 * Must stay a short hex string: embedding raw JSON into YAML consts breaks parsing
 * (Floor went valid:false / definition:null in the first seed attempt).
 */
export const structuralFingerprint = (definition: WorkflowYaml | null | undefined): string => {
  if (!definition) return '';
  const triggers = (definition.triggers ?? []).map((t) => {
    const rec = t as Record<string, unknown>;
    return { type: rec.type };
  });
  const raw = JSON.stringify({ steps: definition.steps ?? [], triggers });
  return createHash('sha256').update(raw).digest('hex');
};

export const parseWorkflowYaml = (yaml: string): WorkflowYaml => {
  const parsed = parseYamlToJSONWithoutValidation(yaml);
  if (!parsed.success || !parsed.json) {
    throw new Error(
      parsed.success === false
        ? parsed.error instanceof Error
          ? parsed.error.message
          : String(parsed.error)
        : 'Failed to parse workflow YAML'
    );
  }
  return parsed.json as WorkflowYaml;
};

const applySettingsToDefinition = (
  definition: WorkflowYaml,
  patch: WatchSettingsPatch
): WorkflowYaml => {
  const next: WorkflowYaml = {
    ...definition,
    consts: { ...(definition.consts ?? {}) },
  };

  if (patch.description !== undefined) {
    next.description = patch.description;
  }

  const policyRaw = isRecord(next.consts?.watch_policy) ? { ...next.consts!.watch_policy } : {};
  if (patch.autonomyLevel !== undefined) {
    policyRaw.autonomyLevel = patch.autonomyLevel;
  }
  next.consts = {
    ...next.consts,
    watch_policy: policyRaw,
  };

  if (patch.scheduleInterval !== undefined) {
    const triggers = [...(next.triggers ?? [])];
    const scheduledIdx = triggers.findIndex((t) => {
      const type = (t as { type?: string }).type;
      return type === 'scheduled' || type === 'schedule';
    });
    if (scheduledIdx >= 0) {
      const existing = triggers[scheduledIdx] as Record<string, unknown>;
      const withBlock = isRecord(existing.with) ? { ...existing.with } : {};
      // Drop rrule when switching to simple every-interval (POC Dark seed uses every).
      delete withBlock.rrule;
      withBlock.every = patch.scheduleInterval;
      triggers[scheduledIdx] = { ...existing, with: withBlock } as (typeof triggers)[number];
      next.triggers = triggers;

      const minutes = intervalToMinutes(patch.scheduleInterval);
      if (minutes != null && isRecord(next.consts.watch_policy)) {
        next.consts.watch_policy = { ...next.consts.watch_policy, every: minutes };
      }
    }
  }

  return next;
};

export const intervalToMinutes = (interval: string): number | undefined => {
  const match = /^(\d+)(m|h|d)$/.exec(interval.trim());
  if (!match) return undefined;
  const n = Number(match[1]);
  if (match[2] === 'm') return n;
  if (match[2] === 'h') return n * 60;
  if (match[2] === 'd') return n * 60 * 24;
  return undefined;
};

export const extractScheduleInterval = (
  definition: WorkflowYaml | null | undefined
): string | undefined => {
  for (const trigger of definition?.triggers ?? []) {
    const type = (trigger as { type?: string }).type;
    if (type !== 'scheduled' && type !== 'schedule') continue;
    const withBlock = (trigger as { with?: Record<string, unknown> }).with;
    if (withBlock && typeof withBlock.every === 'string') return withBlock.every;
  }
  return undefined;
};

export const updateWatchSettings = async ({
  management,
  watchId,
  spaceId,
  request,
  patch,
}: {
  management: WatchWorkflowsManagementClient;
  watchId: string;
  spaceId: string;
  request: KibanaRequest;
  patch: WatchSettingsPatch;
}): Promise<WorkflowDetailDto> => {
  const detail = await management.getWorkflow(watchId, spaceId);
  if (!detail) {
    throw createWatchNotFoundError(watchId);
  }
  if (detail.managed === true) {
    throw Object.assign(new Error(`Managed watch "${watchId}" cannot take settings writes`), {
      statusCode: 403,
    });
  }

  const enableOnly =
    patch.enabled !== undefined &&
    patch.description === undefined &&
    patch.autonomyLevel === undefined &&
    patch.scheduleInterval === undefined;

  if (enableOnly) {
    await management.updateWorkflow(watchId, { enabled: patch.enabled }, spaceId, request);
    const refreshedEnabled = await management.getWorkflow(watchId, spaceId);
    if (!refreshedEnabled) {
      throw createWatchNotFoundError(watchId);
    }
    return refreshedEnabled;
  }

  const sourceYaml = detail.yaml ?? stringifyWorkflowDefinition(detail.definition ?? {});
  let definition = parseWorkflowYaml(sourceYaml);
  definition = applySettingsToDefinition(definition, patch);
  const yaml = stringifyWorkflowDefinition(definition as unknown as Record<string, unknown>);

  const update: { yaml: string; enabled?: boolean } = { yaml };
  if (patch.enabled !== undefined) {
    update.enabled = patch.enabled;
  }

  await management.updateWorkflow(watchId, update, spaceId, request);
  const refreshed = await management.getWorkflow(watchId, spaceId);
  if (!refreshed) {
    throw createWatchNotFoundError(watchId);
  }
  return refreshed;
};

export interface ApplyCatalogUpdateResult {
  updated: boolean;
  conflict?: boolean;
  conflictReason?: string;
  fromVersion?: number;
  toVersion?: number;
}

/**
 * Install catalogue YAML at the shipped version, re-applying customer settings.
 * Refuses (conflict) when the customer edited the definition body vs their seed version.
 */
export const applyCatalogUpdate = async ({
  management,
  watchId,
  spaceId,
  request,
  force = false,
}: {
  management: WatchWorkflowsManagementClient;
  watchId: string;
  spaceId: string;
  request: KibanaRequest;
  force?: boolean;
}): Promise<ApplyCatalogUpdateResult> => {
  if (!isPrebuiltWatchId(watchId)) {
    throw Object.assign(new Error(`Watch "${watchId}" is not a pre-built catalogue id`), {
      statusCode: 400,
    });
  }

  const detail = await management.getWorkflow(watchId, spaceId);
  if (!detail) {
    throw createWatchNotFoundError(watchId);
  }
  if (detail.managed === true) {
    throw Object.assign(new Error(`Managed watch "${watchId}" cannot take catalogue updates`), {
      statusCode: 403,
    });
  }

  const entry = PREBUILT_WATCH_CATALOG[watchId];
  const provenance = extractProvenance(detail.definition);
  const fromVersion = provenance?.seedContentVersion ?? 0;
  const toVersion = entry.version;

  if (fromVersion >= toVersion) {
    return { updated: false, fromVersion, toVersion };
  }

  const sourceYaml = detail.yaml ?? stringifyWorkflowDefinition(detail.definition ?? {});
  const currentDef = parseWorkflowYaml(sourceYaml);
  const currentFp = structuralFingerprint(currentDef);
  const expectedFp = provenance?.structuralHash;
  const conflict =
    typeof expectedFp === 'string' && expectedFp.length > 0 && currentFp !== expectedFp;

  if (conflict && !force) {
    return {
      updated: false,
      conflict: true,
      conflictReason:
        'Customer edited the watch definition body (not just settings). Taking the update would overwrite those edits. Re-submit with force=true to overwrite, or leave as-is.',
      fromVersion,
      toVersion,
    };
  }

  // Preserve customer settings from the live document.
  const customerSettings: WatchSettingsPatch = {
    enabled: detail.enabled,
    description: detail.description ?? currentDef.description,
    autonomyLevel: isRecord(currentDef.consts?.watch_policy)
      ? (currentDef.consts!.watch_policy.autonomyLevel as number | undefined)
      : undefined,
    scheduleInterval: extractScheduleInterval(currentDef),
  };

  let nextDef = parseWorkflowYaml(getCatalogYaml(watchId, toVersion));
  nextDef = applySettingsToDefinition(nextDef, {
    description: customerSettings.description,
    autonomyLevel: customerSettings.autonomyLevel,
    scheduleInterval: customerSettings.scheduleInterval,
  });

  // Ensure provenance reflects the new catalogue version + new body hash.
  nextDef.consts = {
    ...nextDef.consts,
    watch_provenance: {
      originSeedId: watchId,
      seedContentVersion: toVersion,
      structuralHash: structuralFingerprint(nextDef),
    },
  };

  const yaml = stringifyWorkflowDefinition(nextDef as unknown as Record<string, unknown>);
  await management.updateWorkflow(
    watchId,
    { yaml, enabled: customerSettings.enabled },
    spaceId,
    request
  );

  // Re-stamp structuralHash from whatever the engine persisted.
  const persisted = await management.getWorkflow(watchId, spaceId);
  if (persisted) {
    const persistedYaml =
      persisted.yaml ??
      stringifyWorkflowDefinition(persisted.definition as unknown as Record<string, unknown>);
    const persistedDef = parseWorkflowYaml(persistedYaml);
    persistedDef.consts = {
      ...persistedDef.consts,
      watch_provenance: {
        originSeedId: watchId,
        seedContentVersion: toVersion,
        structuralHash: structuralFingerprint(persistedDef),
      },
    };
    await management.updateWorkflow(
      watchId,
      {
        yaml: stringifyWorkflowDefinition(persistedDef as unknown as Record<string, unknown>),
        enabled: customerSettings.enabled,
      },
      spaceId,
      request
    );
  }

  return { updated: true, conflict: conflict || undefined, fromVersion, toVersion };
};
