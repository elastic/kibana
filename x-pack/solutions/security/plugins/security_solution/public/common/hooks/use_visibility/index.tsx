/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useCallback } from 'react';

type UseVisibility = (
  initialState: boolean,
  callbacks?: { onOpen?: () => void; onClose?: () => void }
) => [isVisible: boolean, open: () => void, close: () => void];

export const useVisibility: UseVisibility = (initialState, { onOpen, onClose } = {}) => {
  const [isVisible, setIsVisible] = useState(initialState);

  const open = useCallback(() => {
    setIsVisible(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsVisible(false);
    onClose?.();
  }, [onClose]);

  return [isVisible, open, close];
};
