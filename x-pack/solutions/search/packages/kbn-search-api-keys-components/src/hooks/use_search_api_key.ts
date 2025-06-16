/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { EventEmitter } from 'events';
import { useCreateApiKey } from './use_create_api_key';
import { useValidateApiKey } from './use_validate_api_key';
import { Status } from '../constants';

const API_KEY_STORAGE_KEY = 'searchApiKey';

interface UseSearchApiKeyParams {
  apiKey: string | null;
  toggleApiKeyVisibility: () => void;
  updateApiKey: ({ id, encoded }: { id: string; encoded: string }) => void;
  status: Status;
}

interface ApiKeyState {
  apiKey: string | null;
  status: Status;
}

interface ApiKeyEventEmitter extends EventEmitter {
  on(event: 'change', listener: (state: ApiKeyState) => void): this;
  emit(event: 'change', state: ApiKeyState): boolean;
}

const apiKeyState: ApiKeyState = {
  apiKey: null,
  status: Status.uninitialized,
};

const apiKeyEmitter: ApiKeyEventEmitter = new EventEmitter();

const updateApiKeyState = (newState: Partial<ApiKeyState>) => {
  Object.assign(apiKeyState, newState);
  apiKeyEmitter.emit('change', apiKeyState);
};

export const useSearchApiKey = (): UseSearchApiKeyParams => {
  const [state, setState] = useState<ApiKeyState>(apiKeyState);

  const validateApiKey = useValidateApiKey();
  const createApiKey = useCreateApiKey({
    onSuccess: (receivedApiKey) => {
      if (receivedApiKey) {
        sessionStorage.setItem(
          API_KEY_STORAGE_KEY,
          JSON.stringify({ id: receivedApiKey.id, encoded: receivedApiKey.encoded })
        );
        updateApiKeyState({ apiKey: receivedApiKey.encoded, status: Status.showHiddenKey });
      }
    },
    onError: (err) => {
      if (err.response?.status === 400) {
        updateApiKeyState({ status: Status.showCreateButton });
      } else if (err.response?.status === 403) {
        updateApiKeyState({ status: Status.showUserPrivilegesError });
      } else {
        throw err;
      }
    },
  });

  useEffect(() => {
    const handleChange = (newState: ApiKeyState) => {
      setState({ ...newState });
    };

    apiKeyEmitter.on('change', handleChange);

    if (
      [Status.uninitialized, Status.showHiddenKey, Status.showPreviewKey].includes(
        apiKeyState.status
      )
    ) {
      (async () => {
        try {
          const prevState = apiKeyState.status;
          updateApiKeyState({ status: Status.loading });
          const storedKey = sessionStorage.getItem(API_KEY_STORAGE_KEY);

          if (storedKey) {
            const { id, encoded } = JSON.parse(storedKey);

            if (await validateApiKey(id)) {
              updateApiKeyState({
                apiKey: encoded,
                status: prevState !== Status.uninitialized ? prevState : Status.showHiddenKey,
              });
            } else {
              sessionStorage.removeItem(API_KEY_STORAGE_KEY);
              updateApiKeyState({ apiKey: null, status: Status.showCreateButton });
              await createApiKey();
            }
          } else {
            await createApiKey();
          }
        } catch (e) {
          updateApiKeyState({ apiKey: null, status: Status.showCreateButton });
        }
      })();
    }

    return () => {
      apiKeyEmitter.off('change', handleChange);
    };
  }, [validateApiKey, createApiKey]);

  const updateApiKey = ({ id, encoded }: { id: string; encoded: string }) => {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, JSON.stringify({ id, encoded }));
    updateApiKeyState({ apiKey: encoded, status: Status.showHiddenKey });
  };

  const toggleApiKeyVisibility = () => {
    const newStatus =
      apiKeyState.status === Status.showHiddenKey ? Status.showPreviewKey : Status.showHiddenKey;
    updateApiKeyState({ status: newStatus });
  };

  return {
    apiKey: state.apiKey,
    status: state.status,
    updateApiKey,
    toggleApiKeyVisibility,
  };
};
