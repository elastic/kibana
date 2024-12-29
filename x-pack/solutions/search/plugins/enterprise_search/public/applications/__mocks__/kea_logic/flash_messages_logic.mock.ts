/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockFlashMessagesValues = {
  messages: [],
  queuedMessages: [],
};

export const mockFlashMessagesActions = {
  setFlashMessages: jest.fn(),
  clearFlashMessages: jest.fn(),
  setQueuedMessages: jest.fn(),
  clearQueuedMessages: jest.fn(),
  dismissToastMessage: jest.fn(),
};

export const mockFlashMessageHelpers = {
  flashAPIErrors: jest.fn(),
  setSuccessMessage: jest.fn(),
  setErrorMessage: jest.fn(),
  setQueuedSuccessMessage: jest.fn(),
  setQueuedErrorMessage: jest.fn(),
  clearFlashMessages: jest.fn(),
  flashSuccessToast: jest.fn(),
  flashErrorToast: jest.fn(),
  toastAPIErrors: jest.fn(),
};

jest.mock('../../shared/flash_messages', () => ({
  ...(jest.requireActual('../../shared/flash_messages') as object),
  ...mockFlashMessageHelpers,
  FlashMessagesLogic: {
    values: mockFlashMessagesValues,
    actions: mockFlashMessagesActions,
  },
}));
