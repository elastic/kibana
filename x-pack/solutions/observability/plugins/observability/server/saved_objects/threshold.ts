/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import type { SavedObject, SavedObjectsType } from '@kbn/core/server';
import { metricsExplorerViewSavedObjectRT } from '../types';

export const thresholdExplorerViewSavedObjectName = 'threshold-explorer-view';

const getThresholdExplorerViewTitle = (savedObject: SavedObject<unknown>) =>
  pipe(
    metricsExplorerViewSavedObjectRT.decode(savedObject),
    fold(
      () => `Threshold explorer view [id=${savedObject.id}]`,
      ({ attributes: { name } }) => name
    )
  );

export const threshold: SavedObjectsType = {
  name: thresholdExplorerViewSavedObjectName,
  hidden: false,
  namespaceType: 'multiple-isolated',
  management: {
    defaultSearchField: 'name',
    displayName: 'threshold explorer view',
    getTitle: getThresholdExplorerViewTitle,
    icon: 'metricsApp',
    importableAndExportable: true,
  },
  mappings: {
    dynamic: false,
    properties: {},
  },
};
