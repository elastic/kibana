/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import * as rt from 'io-ts';
import { datasetRT } from '../datasets';
import { dataViewDescriptorRT } from '../data_views/types';

const integrationNameRT = rt.partial({
  name: rt.string,
});

const integrationTitleRT = rt.partial({
  title: rt.string,
});

const integrationVersionRT = rt.partial({
  version: rt.string,
});

const singleDatasetSelectionPayloadRT = rt.intersection([
  integrationNameRT,
  integrationTitleRT,
  integrationVersionRT,
  rt.type({
    dataset: datasetRT,
  }),
]);

const dataViewSelectionPayloadRT = rt.type({
  dataView: dataViewDescriptorRT,
});

const unresolvedDatasetSelectionPayloadRT = rt.intersection([
  integrationNameRT,
  rt.type({
    dataset: datasetRT,
  }),
]);

export const allDatasetSelectionPlainRT = rt.type({
  selectionType: rt.literal('all'),
});

export const dataViewSelectionPlainRT = rt.type({
  selectionType: rt.literal('dataView'),
  selection: dataViewSelectionPayloadRT,
});

export const singleDatasetSelectionPlainRT = rt.type({
  selectionType: rt.literal('single'),
  selection: singleDatasetSelectionPayloadRT,
});

export const unresolvedDatasetSelectionPlainRT = rt.type({
  selectionType: rt.literal('unresolved'),
  selection: unresolvedDatasetSelectionPayloadRT,
});

export const dataSourceSelectionPlainRT = rt.union([
  allDatasetSelectionPlainRT,
  dataViewSelectionPlainRT,
  singleDatasetSelectionPlainRT,
  unresolvedDatasetSelectionPlainRT,
]);

export type SingleDatasetSelectionPayload = rt.TypeOf<typeof singleDatasetSelectionPayloadRT>;
export type DataViewSelectionPayload = rt.TypeOf<typeof dataViewSelectionPayloadRT>;
export type UnresolvedDatasetSelectionPayload = rt.TypeOf<
  typeof unresolvedDatasetSelectionPayloadRT
>;

export type DataSourceSelectionPlain = rt.TypeOf<typeof dataSourceSelectionPlainRT>;

export type DataViewSpecWithId = DataViewSpec & {
  id: string;
};

export interface DataSourceSelectionStrategy {
  toDataviewSpec(): DataViewSpecWithId;
  toPlainSelection(): DataSourceSelectionPlain;
}
