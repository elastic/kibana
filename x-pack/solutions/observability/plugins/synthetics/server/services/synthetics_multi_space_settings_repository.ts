/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type {
  SyntheticsMultiSpaceSettings,
  SyntheticsMultiSpaceSettingsWithSpaces,
} from '../../common/runtime_types';
import { SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE } from '../saved_objects/synthetics_settings_multi_space';

export interface SyntheticsMultiSpaceSettingsRepository {
  get(): Promise<SyntheticsMultiSpaceSettingsWithSpaces>;
  save(
    settings: SyntheticsMultiSpaceSettings,
    spaces?: string[]
  ): Promise<SyntheticsMultiSpaceSettingsWithSpaces>;
}

export const DEFAULT_MULTI_SPACE_SETTINGS: SyntheticsMultiSpaceSettings = {
  useAllRemoteClusters: false,
  selectedRemoteClusters: [],
};

// Backed by the `synthetics-settings-multi-space` saved object (namespaceType: 'multiple').
// Because the SO can be shared across spaces, lookups use `find` rather than a deterministic
// `get` by id. On first save we anchor the document to the requested spaces (defaulting to the
// active space); on subsequent saves we diff the requested spaces against the SO's current
// namespaces and reconcile via `updateObjectsSpaces`.
export class DefaultSyntheticsMultiSpaceSettingsRepository
  implements SyntheticsMultiSpaceSettingsRepository
{
  constructor(private readonly soClient: SavedObjectsClientContract) {}

  async get(): Promise<SyntheticsMultiSpaceSettingsWithSpaces> {
    const response = await this.soClient.find<SyntheticsMultiSpaceSettings>({
      type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
      perPage: 1,
    });

    if (response.saved_objects.length === 0) {
      return {
        ...DEFAULT_MULTI_SPACE_SETTINGS,
        spaces: [this.currentNamespace()],
      };
    }

    const existing = response.saved_objects[0];
    return {
      ...this.applyDefaults(existing.attributes),
      spaces: existing.namespaces ?? [this.currentNamespace()],
    };
  }

  async save(
    settings: SyntheticsMultiSpaceSettings,
    spaces?: string[]
  ): Promise<SyntheticsMultiSpaceSettingsWithSpaces> {
    const merged = this.applyDefaults(settings);

    const existingResponse = await this.soClient.find<SyntheticsMultiSpaceSettings>({
      type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
      perPage: 1,
    });

    if (existingResponse.saved_objects.length > 0) {
      const existing = existingResponse.saved_objects[0];
      await this.soClient.update<SyntheticsMultiSpaceSettings>(
        SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
        existing.id,
        merged
      );

      const effectiveSpaces = await this.reconcileSpaces(
        existing.id,
        existing.namespaces ?? [],
        spaces
      );

      return { ...merged, spaces: effectiveSpaces };
    }

    const initialNamespaces = spaces?.length ? spaces : [this.currentNamespace()];
    await this.soClient.create<SyntheticsMultiSpaceSettings>(
      SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
      merged,
      { initialNamespaces }
    );
    return { ...merged, spaces: initialNamespaces };
  }

  private async reconcileSpaces(
    id: string,
    currentSpaces: string[],
    requestedSpaces: string[] | undefined
  ): Promise<string[]> {
    if (!requestedSpaces?.length) {
      return currentSpaces;
    }

    const currentSet = new Set(currentSpaces);
    const requestedSet = new Set(requestedSpaces);
    const spacesToAdd = requestedSpaces.filter((space) => !currentSet.has(space));
    const spacesToRemove = currentSpaces.filter((space) => !requestedSet.has(space));

    if (spacesToAdd.length === 0 && spacesToRemove.length === 0) {
      return currentSpaces;
    }

    await this.soClient.updateObjectsSpaces(
      [{ id, type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE }],
      spacesToAdd,
      spacesToRemove
    );

    return requestedSpaces;
  }

  private currentNamespace(): string {
    return this.soClient.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
  }

  private applyDefaults(
    settings: Partial<SyntheticsMultiSpaceSettings>
  ): SyntheticsMultiSpaceSettings {
    return {
      useAllRemoteClusters:
        settings.useAllRemoteClusters ?? DEFAULT_MULTI_SPACE_SETTINGS.useAllRemoteClusters,
      selectedRemoteClusters:
        settings.selectedRemoteClusters ?? DEFAULT_MULTI_SPACE_SETTINGS.selectedRemoteClusters,
    };
  }
}
