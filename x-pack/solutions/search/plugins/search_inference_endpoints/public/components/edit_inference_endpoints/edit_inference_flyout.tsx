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
import { useKibana } from '../../hooks/use_kibana';
import { useQueryInferenceEndpoints } from '../../hooks/use_inference_endpoints';
import { InferenceEndpointUI } from '../all_inference_endpoints/types';

interface EditInterfaceFlyoutProps {
  onFlyoutClose: () => void;
  inferenceEndpointUI: InferenceEndpointUI;
}
export const EditInferenceFlyout: React.FC<EditInterfaceFlyoutProps> = ({
  onFlyoutClose,
  inferenceEndpointUI,
}) => {
  const {
    services: {
      http,
      notifications: { toasts },
    },
  } = useKibana();
  const { refetch } = useQueryInferenceEndpoints();
  const onEditSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  const inferenceEndpoint: InferenceEndpoint = {
    config: {
      inferenceId: inferenceEndpointUI.endpoint,
      taskType: inferenceEndpointUI.type,
      provider: inferenceEndpointUI.provider.service,
      providerConfig: flattenObject(inferenceEndpointUI.provider.service_settings),
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
      onSubmitSuccess={onEditSuccess}
      inferenceEndpoint={inferenceEndpoint}
    />
  );
};
