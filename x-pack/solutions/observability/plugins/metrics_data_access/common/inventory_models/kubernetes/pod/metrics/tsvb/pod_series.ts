/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSchemaFormat, TSVBSeries } from '../../../../types';
import {
  KUBELET_STATS_RECEIVER_OTEL,
  SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION,
  SEMCONV_K8S_POD_CPU_NODE_UTILIZATION,
  SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION,
  SEMCONV_K8S_POD_MEMORY_NODE_UTILIZATION,
  SEMCONV_K8S_POD_NETWORK_IO,
} from '../../../../../constants';

// Same painless pick Inventory snapshot uses. With gap_policy insert_zeros, a
// missing limit avg becomes 0 and the node utilization is selected.
const LIMIT_FALLBACK_SCRIPT = 'params.with_limit > 0.0 ? params.with_limit : params.without_limit';

export const podModelRequires = (schema?: DataSchemaFormat): string[] =>
  schema === 'semconv' ? [KUBELET_STATS_RECEIVER_OTEL] : ['kubernetes.pod'];

export const podCpuSeries = (schema?: DataSchemaFormat): TSVBSeries => {
  const limitField =
    schema === 'semconv'
      ? SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION
      : 'kubernetes.pod.cpu.usage.limit.pct';
  const nodeField =
    schema === 'semconv'
      ? SEMCONV_K8S_POD_CPU_NODE_UTILIZATION
      : 'kubernetes.pod.cpu.usage.node.pct';

  return {
    id: 'cpu',
    split_mode: 'everything',
    metrics: [
      { field: nodeField, id: 'avg-cpu-without', type: 'avg' },
      { field: limitField, id: 'avg-cpu-with', type: 'avg' },
      {
        id: 'cpu-usage',
        type: 'calculation',
        variables: [
          { id: 'cpu_with', name: 'with_limit', field: 'avg-cpu-with' },
          { id: 'cpu_without', name: 'without_limit', field: 'avg-cpu-without' },
        ],
        script: LIMIT_FALLBACK_SCRIPT,
        gap_policy: 'insert_zeros',
      },
    ],
  };
};

export const podMemorySeries = (schema?: DataSchemaFormat): TSVBSeries => {
  const limitField =
    schema === 'semconv'
      ? SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION
      : 'kubernetes.pod.memory.usage.limit.pct';
  const nodeField =
    schema === 'semconv'
      ? SEMCONV_K8S_POD_MEMORY_NODE_UTILIZATION
      : 'kubernetes.pod.memory.usage.node.pct';

  return {
    id: 'memory',
    split_mode: 'everything',
    metrics: [
      { field: nodeField, id: 'avg-memory-without', type: 'avg' },
      { field: limitField, id: 'avg-memory-with', type: 'avg' },
      {
        id: 'memory-usage',
        type: 'calculation',
        variables: [
          { id: 'memory_with', name: 'with_limit', field: 'avg-memory-with' },
          { id: 'memory_without', name: 'without_limit', field: 'avg-memory-without' },
        ],
        script: LIMIT_FALLBACK_SCRIPT,
        gap_policy: 'insert_zeros',
      },
    ],
  };
};

/**
 * Network series for a pod.
 *
 * SemConv stores both directions on `k8s.pod.network.io` and splits them with
 * `direction`. A pod can report the metric once per network interface, so the
 * total traffic for a direction is the sum across interfaces. Taking `max`
 * across interfaces in a single bucket under-reports multi-interface pods, which
 * is why the series splits on `interface` (per-interface `max` + derivative) and
 * then sums the per-interface rates with a `series_agg`, matching the Inventory
 * snapshot's `networkTrafficWithInterfacesWithFilter` sum semantics. For
 * single-interface pods `sum == max`, so their behavior is unchanged.
 */
export const podNetworkSeries = (
  schema: DataSchemaFormat | undefined,
  direction: 'rx' | 'tx',
  positiveOnlyId: string,
  invertId?: string
): TSVBSeries => {
  const rateId = `max-network-${direction}`;
  const derivId = `deriv-max-network-${direction}`;
  const ecsField =
    direction === 'rx' ? 'kubernetes.pod.network.rx.bytes' : 'kubernetes.pod.network.tx.bytes';
  const isSemconv = schema === 'semconv';

  const metrics: TSVBSeries['metrics'] = [
    {
      field: isSemconv ? SEMCONV_K8S_POD_NETWORK_IO : ecsField,
      id: rateId,
      type: 'max',
    },
    {
      field: rateId,
      id: derivId,
      type: 'derivative',
      unit: '1s',
    },
    {
      id: positiveOnlyId,
      type: 'calculation',
      variables: [{ id: 'var-rate', name: 'rate', field: derivId }],
      script: 'params.rate > 0.0 ? params.rate : 0.0',
    },
  ];

  if (invertId) {
    metrics.push({
      id: invertId,
      script: 'params.rate * -1',
      type: 'calculation',
      variables: [{ field: positiveOnlyId, id: 'var-rate', name: 'rate' }],
    });
  }

  if (!isSemconv) {
    return {
      id: direction,
      split_mode: 'everything',
      metrics,
    };
  }

  // Split on `interface` so the per-interface `max` rate is derived independently,
  // then sum those rates back into a single series with a `series_agg`. This makes
  // the Pod Detail total match the Inventory snapshot, which sums per-interface
  // rates rather than collapsing interfaces with a single `max`. The direction is
  // applied as a series `filter` (the same term filter the snapshot uses).
  metrics.push({
    id: `sum-interfaces-network-${direction}`,
    function: 'sum',
    type: 'series_agg',
  });

  return {
    id: direction,
    split_mode: 'terms',
    terms_field: 'interface',
    filter: {
      query: direction === 'rx' ? 'direction: receive' : 'direction: transmit',
      language: 'kuery',
    },
    metrics,
  };
};
