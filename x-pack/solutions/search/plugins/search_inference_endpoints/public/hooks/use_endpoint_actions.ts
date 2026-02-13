/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { ENDPOINT_COPY_SUCCESS } from '../../common/translations';
import { useKibana } from './use_kibana';

export const useEndpointActions = () => {
  const { services } = useKibana();
  const toasts = services.notifications?.toasts;
  const [showDeleteAction, setShowDeleteAction] = useState(false);
  const [showInferenceFlyout, setShowInferenceFlyout] = useState(false);
  const [selectedInferenceEndpoint, setSelectedInferenceEndpoint] = useState<
    InferenceInferenceEndpointInfo | undefined
  >(undefined);

  const copyContent = useCallback(
    (inferenceId: string) => {
      const message = ENDPOINT_COPY_SUCCESS(inferenceId);
      navigator.clipboard.writeText(inferenceId).then(
        () => {
          toasts?.addSuccess({
            title: message,
          });
        },
        () => {
          toasts?.addDanger({
            title: message,
          });
        }
      );
    },
    [toasts]
  );

  const onCancelDeleteModal = useCallback(() => {
    setSelectedInferenceEndpoint(undefined);
    setShowDeleteAction(false);
  }, []);

  const displayDeleteActionItem = useCallback(
    (selectedEndpoint: InferenceInferenceEndpointInfo) => {
      setSelectedInferenceEndpoint(selectedEndpoint);
      setShowDeleteAction(true);
    },
    []
  );

  const displayInferenceFlyout = useCallback((selectedEndpoint: InferenceInferenceEndpointInfo) => {
    setSelectedInferenceEndpoint(selectedEndpoint);
    setShowInferenceFlyout(true);
  }, []);

  const onCloseInferenceFlyout = useCallback(() => {
    setShowInferenceFlyout(false);
    setSelectedInferenceEndpoint(undefined);
  }, []);

  return {
    showDeleteAction,
    showInferenceFlyout,
    selectedInferenceEndpoint,
    copyContent,
    onCancelDeleteModal,
    displayDeleteActionItem,
    displayInferenceFlyout,
    onCloseInferenceFlyout,
  };
};
