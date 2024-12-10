/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/search-types';
import type { NetworkTopNFlowRequestOptions } from '../../../../../../common/api/search_strategy';
import type {
  Direction,
  GeoItem,
  NetworkTopNFlowBuckets,
  NetworkTopNFlowEdges,
  AutonomousSystemItem,
  FlowTargetSourceDest,
} from '../../../../../../common/search_strategy';
import { NetworkTopTablesFields } from '../../../../../../common/search_strategy';
import { getOppositeField } from '../helpers';
import {
  formatResponseObjectValues,
  transformLocationFields,
  unflattenObject,
} from '../../../../helpers/format_response_object_values';

export const getTopNFlowEdges = (
  response: IEsSearchResponse<unknown>,
  options: NetworkTopNFlowRequestOptions
): NetworkTopNFlowEdges[] =>
  formatTopNFlowEdges(
    getOr([], `aggregations.${options.flowTarget}.buckets`, response.rawResponse),
    options.flowTarget
  );

const formatTopNFlowEdges = (
  buckets: NetworkTopNFlowBuckets[],
  flowTarget: FlowTargetSourceDest
): NetworkTopNFlowEdges[] =>
  buckets.map((bucket: NetworkTopNFlowBuckets) => ({
    node: {
      _id: bucket.key,
      [flowTarget]: {
        domain: bucket.domain.buckets.map((bucketDomain) => bucketDomain.key),
        ip: bucket.key,
        location: getGeoItem(bucket, flowTarget),
        autonomous_system: getAsItem(bucket),
        flows: getOr(0, 'flows.value', bucket),
        [`${getOppositeField(flowTarget)}_ips`]: getOr(
          0,
          `${getOppositeField(flowTarget)}_ips.value`,
          bucket
        ),
      },
      network: {
        bytes_in: getOr(0, 'bytes_in.value', bucket),
        bytes_out: getOr(0, 'bytes_out.value', bucket),
      },
    },
    cursor: {
      value: bucket.key,
      tiebreaker: null,
    },
  }));

const getGeoItem = (
  result: NetworkTopNFlowBuckets,
  flowTarget: FlowTargetSourceDest
): GeoItem | null =>
  result.location.top_geo.hits.hits.length > 0 && result.location.top_geo.hits.hits[0].fields
    ? {
        geo: formatResponseObjectValues(
          getOr(
            '',
            `${flowTarget}.geo`,
            unflattenObject(
              transformLocationFields(getOr({}, `location.top_geo.hits.hits[0].fields`, result))
            )
          )
        ),
        flowTarget,
      }
    : null;

const getAsItem = (result: NetworkTopNFlowBuckets): AutonomousSystemItem | null =>
  result.autonomous_system.top_as.hits.hits.length > 0 &&
  result.autonomous_system.top_as.hits.hits[0].fields
    ? {
        number: getOr(
          null,
          `autonomous_system.top_as.hits.hits[0].fields['${
            Object.keys(result.autonomous_system.top_as.hits.hits[0].fields)[0].split('.as.')[0]
          }.as.number'][0]`,
          result
        ),
        name: getOr(
          '',
          `autonomous_system.top_as.hits.hits[0].fields['${
            Object.keys(result.autonomous_system.top_as.hits.hits[0].fields)[0].split('.as')[0]
          }.as.organization.name'][0]`,
          result
        ),
      }
    : null;

type QueryOrder =
  | { bytes_in: Direction }
  | { bytes_out: Direction }
  | { flows: Direction }
  | { destination_ips: Direction }
  | { source_ips: Direction };

export const getQueryOrder = (
  networkTopNFlowSortField: NetworkTopNFlowRequestOptions['sort']
): QueryOrder => {
  if (networkTopNFlowSortField.field === NetworkTopTablesFields.bytes_in) {
    return { bytes_in: networkTopNFlowSortField.direction };
  } else if (networkTopNFlowSortField.field === NetworkTopTablesFields.bytes_out) {
    return { bytes_out: networkTopNFlowSortField.direction };
  } else if (networkTopNFlowSortField.field === NetworkTopTablesFields.flows) {
    return { flows: networkTopNFlowSortField.direction };
  } else if (networkTopNFlowSortField.field === NetworkTopTablesFields.destination_ips) {
    return { destination_ips: networkTopNFlowSortField.direction };
  } else if (networkTopNFlowSortField.field === NetworkTopTablesFields.source_ips) {
    return { source_ips: networkTopNFlowSortField.direction };
  } else {
    throw new Error(`Ordering on ${networkTopNFlowSortField.field} not currently supported`);
  }
};
