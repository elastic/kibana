/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { SyntheticsMultiSpaceSettings } from '../../common/runtime_types';
import { SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE } from '../saved_objects/synthetics_settings_multi_space';

export interface SyntheticsMultiSpaceSettingsRepository {
  get(): Promise<SyntheticsMultiSpaceSettings>;
  save(settings: SyntheticsMultiSpaceSettings): Promise<SyntheticsMultiSpaceSettings>;
}

export const DEFAULT_MULTI_SPACE_SETTINGS: SyntheticsMultiSpaceSettings = {
  useAllRemoteClusters: false,
  selectedRemoteClusters: [],
};

// Backed by the `synthetics-settings-multi-space` saved object (namespaceType: 'multiple').
// Because the SO can be shared across spaces, lookups use `find` rather than a deterministic
// `get` by id; on first save we anchor the document to the active space via `initialNamespaces`,
// leaving the door open for a future "share to multiple spaces" UI without migrating the SO.
export class DefaultSyntheticsMultiSpaceSettingsRepository
  implements SyntheticsMultiSpaceSettingsRepository
{
  constructor(private readonly soClient: SavedObjectsClientContract) {}

  async get(): Promise<SyntheticsMultiSpaceSettings> {
    const response = await this.soClient.find<SyntheticsMultiSpaceSettings>({
      type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
      perPage: 1,
    });

    if (response.saved_objects.length === 0) {
      return DEFAULT_MULTI_SPACE_SETTINGS;
    }

    return this.applyDefaults(response.saved_objects[0].attributes);
  }

  async save(settings: SyntheticsMultiSpaceSettings): Promise<SyntheticsMultiSpaceSettings> {
    const merged = this.applyDefaults(settings);

    const existing = await this.soClient.find<SyntheticsMultiSpaceSettings>({
      type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
      perPage: 1,
    });

    if (existing.saved_objects.length > 0) {
      await this.soClient.update<SyntheticsMultiSpaceSettings>(
        SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
        existing.saved_objects[0].id,
        merged
      );
      return merged;
    }

    const initialNamespace = this.soClient.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    await this.soClient.create<SyntheticsMultiSpaceSettings>(
      SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
      merged,
      { initialNamespaces: [initialNamespace] }
    );
    return merged;
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
