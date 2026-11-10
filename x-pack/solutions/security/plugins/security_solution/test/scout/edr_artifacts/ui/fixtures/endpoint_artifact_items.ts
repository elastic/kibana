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

// No comma: `findItemIds` cannot query a name that contains one.
const newName = (base: string): string =>
  `${base} ${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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
    const name = newName(base);
    this.trackName(listId, name);
    return name;
  }

  /** Track a name the test gives an item later (for example after an edit). */
  trackName(listId: string, name: string): void {
    const names = this.namesByList.get(listId) ?? new Set<string>();
    names.add(name);
    this.namesByList.set(listId, names);
  }

  /**
   * Creates an item with a unique name through the API and returns that name.
   * The name is tracked before the POST, so an item the route persisted but
   * failed to acknowledge is still found at cleanup; once the `item_id` is
   * known the name lookup is dropped and cleanup deletes by id only.
   */
  async create({
    listId,
    name: base,
    entries,
    osTypes,
    policyId,
  }: CreateTrackedEndpointArtifactItemInput): Promise<string> {
    const name = this.uniqueName(listId, base);
    const { itemId } = await this.endpointArtifacts.createItem({
      name,
      listId,
      entries,
      osTypes,
      policyId,
    });
    this.namesByList.get(listId)?.delete(name);
    this.itemIds.add(itemId);
    return name;
  }

  /**
   * Deletes every tracked item. One failed lookup or delete does not stop the
   * others; the failures are rethrown together at the end.
   */
  async cleanup(): Promise<void> {
    const lookups = [...this.namesByList].flatMap(([listId, names]) =>
      [...names].map((name) => this.endpointArtifacts.findItemIds({ listId, name }))
    );
    const found = await Promise.allSettled(lookups);
    const itemIds = new Set(this.itemIds);
    for (const result of found) {
      if (result.status === 'fulfilled') {
        result.value.forEach((itemId) => itemIds.add(itemId));
      }
    }
    const deletions = await Promise.allSettled(
      [...itemIds].map((itemId) => this.endpointArtifacts.deleteItem(itemId))
    );
    this.itemIds.clear();
    this.namesByList.clear();

    const failures = [...found, ...deletions].flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : []
    );
    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        `endpointArtifactItems cleanup: ${failures.length} failed`
      );
    }
  }
}
