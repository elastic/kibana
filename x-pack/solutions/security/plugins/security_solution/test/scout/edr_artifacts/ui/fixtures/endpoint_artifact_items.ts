/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointArtifactsApiService } from '@kbn/scout-security';

export interface CreateTrackedEndpointArtifactItemInput {
  listId: string;
  /** Base name; the created item gets a unique suffix. */
  name: string;
  entries: object[];
  osTypes: string[];
  policyId?: string;
}

const uniqueSuffix = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Tracks the items one test creates on an agnostic endpoint artifact list so
 * teardown deletes only those, by `item_id`, and never the whole list.
 *
 * Agnostic lists are not space-isolated, so `deleteList` from one worker
 * wipes items another spec file is asserting on. Items created through the
 * API are tracked by `item_id`; items created through the UI are tracked by
 * their unique name and resolved to `item_id`s at cleanup time.
 */
export class EndpointArtifactItemTracker {
  private readonly itemIds = new Set<string>();
  private readonly namesByList = new Map<string, Set<string>>();

  constructor(private readonly endpointArtifacts: EndpointArtifactsApiService) {}

  /** A unique item name for `listId`, tracked so cleanup finds the item by name. */
  uniqueName(listId: string, base: string): string {
    const name = `${base} ${uniqueSuffix()}`;
    this.trackName(listId, name);
    return name;
  }

  /** Track a name the test gives an item later (for example after an edit). */
  trackName(listId: string, name: string): void {
    const names = this.namesByList.get(listId) ?? new Set<string>();
    names.add(name);
    this.namesByList.set(listId, names);
  }

  /** Creates an item with a unique name through the API and returns that name. */
  async create({
    listId,
    name: base,
    entries,
    osTypes,
    policyId,
  }: CreateTrackedEndpointArtifactItemInput): Promise<string> {
    const name = `${base} ${uniqueSuffix()}`;
    const { itemId } = await this.endpointArtifacts.createItem({
      name,
      listId,
      entries,
      osTypes,
      policyId,
    });
    this.itemIds.add(itemId);
    return name;
  }

  async cleanup(): Promise<void> {
    const itemIds = new Set(this.itemIds);
    for (const [listId, names] of this.namesByList) {
      for (const name of names) {
        for (const itemId of await this.endpointArtifacts.findItemIds({ listId, name })) {
          itemIds.add(itemId);
        }
      }
    }
    for (const itemId of itemIds) {
      await this.endpointArtifacts.deleteItem(itemId);
    }
    this.itemIds.clear();
    this.namesByList.clear();
  }
}
