/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceFlyoutWrapper } from '@kbn/inference-endpoint-ui-common/src/components/inference_flyout_wrapper';
import React, { useCallback } from 'react';
import { InferenceEndpoint } from '@kbn/inference-endpoint-ui-common';
import { flattenObject } from '@kbn/object-utils';
import { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { useKibana } from '../../hooks/use_kibana';
import { useQueryInferenceEndpoints } from '../../hooks/use_inference_endpoints';

interface EditInterfaceFlyoutProps {
  onFlyoutClose: () => void;
  selectedInferenceEndpoint: InferenceInferenceEndpointInfo;
}
export const EditInferenceFlyout: React.FC<EditInterfaceFlyoutProps> = ({
  onFlyoutClose,
  selectedInferenceEndpoint,
}) => {
  const {
    services: {
      http,
      notifications: { toasts },
      serverless,
    },
  } = useKibana();
  const { refetch } = useQueryInferenceEndpoints();
  const onEditSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  const inferenceEndpoint: InferenceEndpoint = {
    config: {
      inferenceId: selectedInferenceEndpoint.inference_id,
      taskType: selectedInferenceEndpoint.task_type,
      provider: selectedInferenceEndpoint.service,
      providerConfig: flattenObject(selectedInferenceEndpoint.service_settings),
    },
    secrets: {
      providerSecrets: {},
    },
  };
  return (
    <InferenceFlyoutWrapper
      onFlyoutClose={onFlyoutClose}
      http={http}
      toasts={toasts}
      isEdit={true}
      enforceAdaptiveAllocations={!!serverless}
      onSubmitSuccess={onEditSuccess}
      inferenceEndpoint={inferenceEndpoint}
    />
  );
};
