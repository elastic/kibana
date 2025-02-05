/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Subject } from 'rxjs';

const ObservabilityAIAssistantMultipaneFlyoutContext = React.createContext(undefined);

function useChat() {
  return { next: () => {}, messages: [], setMessages: () => {}, state: undefined, stop: () => {} };
}

export function useKibana() {
  return {
    services: {
      application: { navigateToApp: () => {} },
      http: {
        basePath: {
          prepend: () => '',
        },
      },
      notifications: {
        toasts: {
          addSuccess: () => {},
          addError: () => {},
        },
      },
      plugins: {
        start: {
          licensing: {
            license$: new Subject(),
          },
          observabilityAIAssistant: {
            useChat,
            ObservabilityAIAssistantMultipaneFlyoutContext,
          },
          share: {
            url: {
              locators: {
                get: () => {},
              },
            },
          },
          triggersActionsUi: { getAddRuleFlyout: {}, getAddConnectorFlyout: {} },
        },
      },
      uiSettings: {
        get: (setting: string) => {
          if (setting === 'dateFormat') {
            return 'MMM D, YYYY HH:mm';
          }
        },
      },
    },
  };
}
