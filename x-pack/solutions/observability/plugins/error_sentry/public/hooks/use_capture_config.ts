/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import { CAPTURE_LOG_INDEX_DEFAULT } from '../../common/constants';

interface CaptureConfig {
  index: string;
  categoryField: string;
}

export const useCaptureConfig = (http: HttpSetup) => {
  const { data } = useQuery(['errorSentry', 'captureConfig'], ({ signal }) =>
    http.get<CaptureConfig>('/internal/error_sentry/capture_config', { signal })
  );

  return {
    index: data?.index ?? CAPTURE_LOG_INDEX_DEFAULT,
    categoryField: data?.categoryField,
  };
};
