/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/no-empty-interface */

import * as runtimeTypes from 'io-ts';

import { unionWithNullType } from '../../../utility_types';

/*
 *  Note Types
 */
const SavedPinnedEventType = runtimeTypes.intersection([
  runtimeTypes.type({
    timelineId: runtimeTypes.string,
    eventId: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    created: unionWithNullType(runtimeTypes.number),
    createdBy: unionWithNullType(runtimeTypes.string),
    updated: unionWithNullType(runtimeTypes.number),
    updatedBy: unionWithNullType(runtimeTypes.string),
  }),
]);

/**
 * Pinned Event Saved object type with metadata
 */

export const SavedObjectPinnedEventRuntimeType = runtimeTypes.intersection([
  runtimeTypes.type({
    id: runtimeTypes.string,
    attributes: SavedPinnedEventType,
    version: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    pinnedEventId: unionWithNullType(runtimeTypes.string),
  }),
]);

export interface SavedObjectPinnedEvent extends runtimeTypes.TypeOf<typeof SavedPinnedEventType> {}

/**
 * This type represents a pinned event type stored in a saved object that does not include any fields that reference
 * other saved objects.
 */
export type SavedObjectPinnedEventWithoutExternalRefs = Omit<SavedObjectPinnedEvent, 'timelineId'>;
