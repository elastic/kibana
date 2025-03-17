/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useEffect } from 'react';
import type { Integration } from '@kbn/wci-common';
import { useWorkChatServices } from './use_workchat_service';

export interface IntegrationEditState {
  name: string;
  description: string;
  type: string;
  configuration: Record<string, any>;
}

const emptyState = (): IntegrationEditState => {
  return {
    name: '',
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
          name: integration.name,
          description: integration.description,
          type: integration.type,
          configuration: integration.configuration || {},
        });
      }
    };
    fetchIntegration();
  }, [integrationId, integrationService]);

  const setFieldValue = <T extends keyof IntegrationEditState>(
    key: T,
    value: IntegrationEditState[T]
  ) => {
    setEditState((previous) => ({ ...previous, [key]: value }));
  };

  const submit = useCallback(() => {
    setSubmitting(true);

    (integrationId
      ? integrationService.update(integrationId, {
          description: editState.description,
          configuration: editState.configuration,
        })
      : integrationService.create({
          type: editState.type,
          description: editState.description,
          configuration: editState.configuration,
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
  }, [integrationId, editState, integrationService, onSaveSuccess, onSaveError]);

  return {
    editState,
    isSubmitting,
    setFieldValue,
    submit,
  };
};
