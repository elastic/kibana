/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { InferenceStatsResponse } from '@kbn/ml-plugin/public/application/services/ml_api_service/trained_models';
import { useKibana } from './use_kibana';
import { TRAINED_MODEL_STATS_QUERY_KEY } from '../../common/constants';

export const useTrainedModelStats = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: [TRAINED_MODEL_STATS_QUERY_KEY],
    queryFn: async () => {
      const response = await services.ml?.mlApi?.trainedModels.getTrainedModelStats();

      return response || ({ count: 0, trained_model_stats: [] } as InferenceStatsResponse);
    },
  });
};
