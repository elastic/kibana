/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
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

const SETTINGS_FIND_PER_PAGE = 100;

// The "all spaces" wildcard is mutually exclusive with specific space ids: a saved object
// cannot have both `*` and concrete spaces in its `namespaces`. Collapse here so the wildcard
// always wins when the caller passes both.
const normalizeSharedSpaces = (spaces: string[]): string[] =>
  spaces.includes(ALL_SPACES_ID) ? [ALL_SPACES_ID] : spaces;

// Backed by the `synthetics-settings-multi-space` saved object (namespaceType: 'multiple').
// There must be at most one logical settings document per deployment. Lookups search across
// all spaces (via the `*` namespace option) and pick the most-recently-updated object as the
// canonical one when duplicates exist; saves always update that object instead of creating
// another, regardless of which space the request originated from.
export class DefaultSyntheticsMultiSpaceSettingsRepository
  implements SyntheticsMultiSpaceSettingsRepository
{
  constructor(private readonly soClient: SavedObjectsClientContract) {}

  async get(): Promise<SyntheticsMultiSpaceSettingsWithSpaces> {
    const existing = await this.findExistingSettingsObject({ visibleInCurrentSpaceOnly: true });

    if (!existing) {
      return {
        ...DEFAULT_MULTI_SPACE_SETTINGS,
        spaces: [this.currentNamespace()],
      };
    }

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

    // Search globally so a save from any space updates the existing singleton instead of
    // creating a second document when a space-scoped find would have returned nothing.
    const existing = await this.findExistingSettingsObject();

    if (existing) {
      // `update` and `updateObjectsSpaces` both require the saved object to be visible in the
      // current namespace context. When the singleton lives in spaces the caller cannot see
      // (e.g. saving from `default` while the SO is currently only shared with `new_space`),
      // scope the client to one of the SO's existing namespaces so the writes succeed.
      const writeClient = this.scopedWriteClient(existing.namespaces);

      await writeClient.update<SyntheticsMultiSpaceSettings>(
        SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
        existing.id,
        merged
      );

      const effectiveSpaces = await this.reconcileSpaces(
        writeClient,
        existing.id,
        existing.namespaces ?? [],
        spaces
      );

      return { ...merged, spaces: effectiveSpaces };
    }

    const initialNamespaces = spaces?.length
      ? normalizeSharedSpaces(spaces)
      : [this.currentNamespace()];
    await this.soClient.create<SyntheticsMultiSpaceSettings>(
      SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
      merged,
      { initialNamespaces }
    );
    return { ...merged, spaces: initialNamespaces };
  }

  private async findExistingSettingsObject({
    visibleInCurrentSpaceOnly = false,
  }: {
    visibleInCurrentSpaceOnly?: boolean;
  } = {}): Promise<SavedObject<SyntheticsMultiSpaceSettings> | undefined> {
    const response = await this.soClient.find<SyntheticsMultiSpaceSettings>({
      type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
      perPage: SETTINGS_FIND_PER_PAGE,
      namespaces: [ALL_SPACES_ID],
    });

    let candidates = response.saved_objects;

    if (visibleInCurrentSpaceOnly) {
      const currentSpace = this.currentNamespace();
      candidates = candidates.filter((object) =>
        isVisibleInCurrentSpace(object.namespaces, currentSpace)
      );
    }

    if (candidates.length === 0) {
      return undefined;
    }

    return selectCanonicalSettingsObject(candidates);
  }

  private async reconcileSpaces(
    soClient: SavedObjectsClientContract,
    id: string,
    currentSpaces: string[],
    requestedSpaces: string[] | undefined
  ): Promise<string[]> {
    if (!requestedSpaces?.length) {
      return currentSpaces;
    }

    const normalizedRequested = normalizeSharedSpaces(requestedSpaces);
    const currentSet = new Set(currentSpaces);
    const requestedSet = new Set(normalizedRequested);
    const spacesToAdd = normalizedRequested.filter((space) => !currentSet.has(space));
    const spacesToRemove = currentSpaces.filter((space) => !requestedSet.has(space));

    if (spacesToAdd.length === 0 && spacesToRemove.length === 0) {
      return currentSpaces;
    }

    await soClient.updateObjectsSpaces(
      [{ id, type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE }],
      spacesToAdd,
      spacesToRemove
    );

    return normalizedRequested;
  }

  private scopedWriteClient(existingNamespaces: string[] | undefined): SavedObjectsClientContract {
    const currentSpace = this.currentNamespace();
    const isVisibleHere =
      existingNamespaces?.includes(ALL_SPACES_ID) || existingNamespaces?.includes(currentSpace);

    if (isVisibleHere || !existingNamespaces?.length) {
      return this.soClient;
    }

    return this.soClient.asScopedToNamespace(existingNamespaces[0]);
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

const isVisibleInCurrentSpace = (
  namespaces: string[] | undefined,
  currentSpace: string
): boolean => {
  if (!namespaces?.length) {
    return false;
  }
  return namespaces.includes(ALL_SPACES_ID) || namespaces.includes(currentSpace);
};

const selectCanonicalSettingsObject = (
  objects: Array<SavedObject<SyntheticsMultiSpaceSettings>>
): SavedObject<SyntheticsMultiSpaceSettings> =>
  [...objects].sort((left, right) => {
    const leftUpdatedAt = left.updated_at ? new Date(left.updated_at).getTime() : 0;
    const rightUpdatedAt = right.updated_at ? new Date(right.updated_at).getTime() : 0;
    return rightUpdatedAt - leftUpdatedAt;
  })[0];
