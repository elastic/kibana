/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { i18n } from '@kbn/i18n';
import { SERVICE_PROVIDERS, ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';

import {
  type GroupedInferenceEndpointsData,
  type GroupByViewOptions,
  GroupByOptions,
} from '../types';

import { getModelId } from './get_model_id';
import { KNOWN_MODEL_GROUPS, ELASTIC_GROUP_ID } from './known_models';

export const UNKNOWN_MODEL_ID_FALLBACK = 'unknown_model';
const UNKNOWN_MODEL_LABEL_FALLBACK = i18n.translate(
  'xpack.searchInferenceEndpoints.groupedEndpoints.unknownModelLabel',
  {
    defaultMessage: 'Unknown Model',
  }
);

export const GroupByModelReducer = (
  acc: Record<string, GroupedInferenceEndpointsData>,
  endpoint: InferenceAPIConfigResponse
): Record<string, GroupedInferenceEndpointsData> => {
  const modelId = getModelId(endpoint) ?? UNKNOWN_MODEL_ID_FALLBACK;

  // Test model against predefined known model groups. If it matches, group by the known group.
  // otherwise group by the model ID. In the future endpoints should have metadata that allows for more robust grouping,
  // but this is a start to make the UI more user friendly.
  const knownGroup = KNOWN_MODEL_GROUPS.find((group) => group.groupTest(modelId));
  if (knownGroup) {
    if (knownGroup.groupId in acc) {
      acc[knownGroup.groupId].endpoints.push(endpoint);
    } else {
      acc[knownGroup.groupId] = {
        groupId: knownGroup.groupId,
        groupLabel: knownGroup.groupLabel,
        endpoints: [endpoint],
      };
    }
  } else {
    if (modelId in acc) {
      acc[modelId].endpoints.push(endpoint);
    } else {
      acc[modelId] = {
        groupId: modelId,
        groupLabel: modelId === UNKNOWN_MODEL_ID_FALLBACK ? UNKNOWN_MODEL_LABEL_FALLBACK : modelId,
        endpoints: [endpoint],
      };
    }
  }

  return acc;
};

export const GroupByServiceReducer = (
  acc: Record<string, GroupedInferenceEndpointsData>,
  endpoint: InferenceAPIConfigResponse
): Record<string, GroupedInferenceEndpointsData> => {
  const service = endpoint.service;

  if (service in acc) {
    acc[service].endpoints.push(endpoint);
  } else {
    const provider = SERVICE_PROVIDERS[service];
    acc[service] = {
      groupId: service,
      groupLabel: provider ? provider.name : service,
      endpoints: [endpoint],
    };
  }

  return acc;
};

export function GroupByReducer(groupBy: GroupByViewOptions) {
  switch (groupBy) {
    case GroupByOptions.Model:
      return GroupByModelReducer;
    case GroupByOptions.Service:
      return GroupByServiceReducer;
    default:
      return assertNever(groupBy);
  }
}

export function defaultGroupedInferenceEndpointsDataCompare(
  a: GroupedInferenceEndpointsData,
  b: GroupedInferenceEndpointsData
) {
  if (a.groupLabel === b.groupLabel) {
    return 0;
  }
  if (a.groupLabel < b.groupLabel) {
    return -1;
  }
  if (a.groupLabel > b.groupLabel) {
    return 1;
  }
  return 0;
}

export function ModelsGroupBySort(
  a: GroupedInferenceEndpointsData,
  b: GroupedInferenceEndpointsData
) {
  if (a.groupLabel === b.groupLabel) {
    return 0;
  }
  if (a.groupId === ELASTIC_GROUP_ID) {
    return -1;
  }
  if (b.groupId === ELASTIC_GROUP_ID) {
    return 1;
  }
  if (a.groupLabel < b.groupLabel) {
    return -1;
  }
  if (a.groupLabel > b.groupLabel) {
    return 1;
  }
  return 0;
}

function isElasticService(service: string) {
  return service === ServiceProviderKeys.elastic || service === ServiceProviderKeys.elasticsearch;
}

export function ServiceGroupBySort(
  a: GroupedInferenceEndpointsData,
  b: GroupedInferenceEndpointsData
) {
  if (a.groupLabel === b.groupLabel) {
    return 0;
  }
  const aIsElastic = isElasticService(a.groupId);
  const bIsElastic = isElasticService(b.groupId);
  if (aIsElastic || bIsElastic) {
    if (aIsElastic && bIsElastic) {
      if (a.groupLabel < b.groupLabel) {
        return -1;
      }
      return 1;
    } else if (aIsElastic) {
      return -1;
    }
    return 1;
  }
  if (a.groupLabel < b.groupLabel) {
    return -1;
  }
  return 1;
}

export function GroupBySort(groupBy: GroupByViewOptions) {
  switch (groupBy) {
    case GroupByOptions.Model:
      return ModelsGroupBySort;
    case GroupByOptions.Service:
      return ServiceGroupBySort;
    default:
      return defaultGroupedInferenceEndpointsDataCompare;
  }
}

export function assertNever(x: never): never {
  throw new Error(`Unhandled groupBy option: ${x}`);
}
