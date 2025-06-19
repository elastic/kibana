/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useCallback } from 'react';

export type UseIsVisible = (
  defaultValue: boolean,
  callbacks?: { onOpen?: () => void; onClose?: () => void; onToggle?: () => void }
) => { isVisible: boolean; open: () => void; close: () => void; toggle: () => void };

export const useIsVisible: UseIsVisible = (defaultValue, { onOpen, onClose, onToggle } = {}) => {
  const [isVisible, setIsVisible] = useState(defaultValue);

  const open = useCallback(() => {
    setIsVisible(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsVisible(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    setIsVisible((prev) => !prev);
    onToggle?.();
  }, [onToggle]);

  return { isVisible, open, close, toggle };
};
