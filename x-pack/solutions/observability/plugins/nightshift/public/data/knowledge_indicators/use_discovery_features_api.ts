/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AggregatedFeature, Feature } from '@kbn/significant-events-schema';
import { useKibana } from '../../hooks/use_kibana';

export interface BulkOperationResult {
  succeededCount: number;
  failedCount: number;
  /** Operations not applied because their source was busy; the same request can succeed later. */
  conflictCount: number;
  /** Per-instance uuids behind `failedCount`; counts are copies, not rows. */
  failedIds: string[];
  conflictIds: string[];
}

export const EMPTY_BULK_OPERATION_RESULT: BulkOperationResult = {
  succeededCount: 0,
  failedCount: 0,
  conflictCount: 0,
  failedIds: [],
  conflictIds: [],
};

type CrossStreamOp =
  | { delete: { id: string } }
  | { exclude: { id: string } }
  | { restore: { id: string } }
  | { durability: { id: string; durable: boolean } };

type BuildOp = (uuid: string) => CrossStreamOp;

type BulkTarget = Feature & Partial<Pick<AggregatedFeature, 'instances'>>;

interface DiscoveryFeaturesApi {
  deleteFeaturesInBulk: (features: BulkTarget[]) => Promise<BulkOperationResult>;
  excludeFeaturesInBulk: (features: BulkTarget[]) => Promise<BulkOperationResult>;
  restoreFeaturesInBulk: (features: BulkTarget[]) => Promise<BulkOperationResult>;
  setFeaturesDurabilityInBulk: (
    features: BulkTarget[],
    durable: boolean
  ) => Promise<BulkOperationResult>;
}

export const getInstanceUuids = ({ uuid, instances }: BulkTarget): string[] =>
  instances?.length ? instances.map((instance) => instance.uuid) : [uuid];

export function useDiscoveryFeaturesApi(): DiscoveryFeaturesApi {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;

  return useMemo(() => {
    // `signal: null` so unmount does not abort a partially-applied mutation.
    const runBulk = async (
      features: BulkTarget[],
      buildOp: BuildOp
    ): Promise<BulkOperationResult> => {
      if (features.length === 0) {
        return EMPTY_BULK_OPERATION_RESULT;
      }
      const { succeeded, failed, conflicts, failedIds, conflictIds } =
        await significantEventsRepositoryClient.fetch('POST /internal/streams/features/_bulk', {
          signal: null,
          params: { body: { operations: features.flatMap(getInstanceUuids).map(buildOp) } },
        });
      return {
        succeededCount: succeeded,
        failedCount: failed,
        conflictCount: conflicts,
        failedIds,
        conflictIds,
      };
    };

    return {
      deleteFeaturesInBulk: (features) => runBulk(features, (id) => ({ delete: { id } })),
      excludeFeaturesInBulk: (features) => runBulk(features, (id) => ({ exclude: { id } })),
      restoreFeaturesInBulk: (features) => runBulk(features, (id) => ({ restore: { id } })),
      setFeaturesDurabilityInBulk: (features, durable) =>
        runBulk(features, (id) => ({ durability: { id, durable } })),
    };
  }, [significantEventsRepositoryClient]);
}
