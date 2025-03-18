/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useEffect } from 'react';
import { useWorkChatServices } from './use_workchat_service';

export interface IntegrationEditState {
  description: string;
  type: string;
  configuration: Record<string, any>;
}

const emptyState = (): IntegrationEditState => {
  return {
    description: '',
    type: '',
    configuration: {},
  };
};

export const useIntegrationEdit = ({
  integrationId,
  onSaveSuccess,
  onSaveError,
}: {
  integrationId: string | undefined;
  onSaveSuccess: (integration: Integration) => void;
  onSaveError: (err: Error) => void;
}) => {
  const { integrationService } = useWorkChatServices();

  const [editState, setEditState] = useState<IntegrationEditState>(emptyState());
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchIntegration = async () => {
      if (integrationId) {
        const integration = await integrationService.get(integrationId);
        setEditState({
          description: integration.description,
          type: integration.type,
          configuration: integration.configuration || {},
        });
      }
    };
    fetchIntegration();
  }, [integrationId, integrationService]);

  const submit = useCallback(
    (customIntegration?: Partial<IntegrationEditState>) => {
      setSubmitting(true);
      
      const integrationData = customIntegration 
        ? { ...editState, ...customIntegration }
        : editState;

      (integrationId
        ? integrationService.update(integrationId, {
            description: integrationData.description,
            configuration: integrationData.configuration,
          })
        : integrationService.create({
            type: integrationData.type,
            description: integrationData.description,
            configuration: integrationData.configuration,
          })
      ).then(
        (response) => {
          setSubmitting(false);
          onSaveSuccess(response);
        },
        (err) => {
          setSubmitting(false);
          onSaveError(err);
        }
      );
    },
    [integrationId, editState, integrationService, onSaveSuccess, onSaveError]
  );

  return {
    editState,
    isSubmitting,
    submit,
  };
};
