/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { formatBytes } from '../../step_details_page/hooks/use_object_metrics';
import { formatAge } from '../data_retention/common';
import { policyLabels } from '../data_retention/policy_labels';
import { getIlmPolicies, getIndicesData } from './api';

export const useGetIlmPolicies = () => {
  const { data, error, loading } = useFetcher(async () => {
    return getIlmPolicies();
  }, []);

  const { data: sizeData, loading: indicesLoading } = useFetcher(async () => {
    return getIndicesData();
  }, []);

  const syntheticsILMPolicies =
    data?.filter(({ indexTemplates }) =>
      indexTemplates?.some((indTemp) => indTemp.includes('synthetics'))
    ) ?? [];

  return {
    data: policyLabels.map(({ name, label, indexTemplate }) => {
      const policy = syntheticsILMPolicies.find((p) =>
        p.indexTemplates?.some((indTemp) => indTemp.includes(indexTemplate))
      );
      const policyIndices = sizeData?.data?.filter((d) => policy?.indices?.includes(d.index!));

      let totalSize =
        policyIndices?.reduce((acc, curr) => {
          return acc + Number(curr?.['store.size']) ?? 0;
        }, 0) ?? 0;

      const phases = policy?.policy.phases ?? {};

      const deletePhase = phases.delete;

      if (name === 'synthetics') {
        totalSize =
          sizeData?.data?.reduce((acc, curr) => {
            return acc + Number(curr?.['store.size']) ?? 0;
          }, 0) ?? 0;
      }

      return {
        name,
        label,
        policy,
        retentionPeriod: formatAge(deletePhase?.min_age),
        currentSize: formatBytes(totalSize),
      };
    }),
    error,
    loading: loading || indicesLoading,
  };
};
