/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibana } from '../../lib/kibana';

export interface UseMessagesStorage {
  getMessages: (plugin: string) => string[];
  addMessage: (plugin: string, id: string) => void;
  removeMessage: (plugin: string, id: string) => void;
  clearAllMessages: (plugin: string) => void;
  hasMessage: (plugin: string, id: string) => boolean;
}

export const useMessagesStorage = (): UseMessagesStorage => {
  const { storage } = useKibana().services;

  const getMessages = useCallback(
    (plugin: string): string[] => storage.get(`${plugin}-messages`) ?? [],
    [storage]
  );

  const addMessage = useCallback(
    (plugin: string, id: string) => {
      const pluginStorage = storage.get(`${plugin}-messages`) ?? [];
      storage.set(`${plugin}-messages`, [...pluginStorage, id]);
    },
    [storage]
  );

  const hasMessage = useCallback(
    (plugin: string, id: string): boolean => {
      const pluginStorage = storage.get(`${plugin}-messages`) ?? [];
      return pluginStorage.filter((val: string) => val === id).length > 0;
    },
    [storage]
  );

  const removeMessage = useCallback(
    (plugin: string, id: string) => {
      const pluginStorage = storage.get(`${plugin}-messages`) ?? [];
      storage.set(`${plugin}-messages`, [...pluginStorage.filter((val: string) => val !== id)]);
    },
    [storage]
  );

  const clearAllMessages = useCallback(
    (plugin: string): string[] => storage.remove(`${plugin}-messages`),
    [storage]
  );

  return {
    getMessages,
    addMessage,
    clearAllMessages,
    removeMessage,
    hasMessage,
  };
};
