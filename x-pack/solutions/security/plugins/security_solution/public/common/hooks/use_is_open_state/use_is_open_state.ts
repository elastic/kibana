/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useCallback } from 'react';

export type UseIsOpen = (
  defaultValue: boolean,
  callbacks?: { onOpen?: () => void; onClose?: () => void; onToggle?: () => void }
) => { isOpen: boolean; open: () => void; close: () => void; toggle: () => void };

export const useIsOpenState: UseIsOpen = (defaultValue, { onOpen, onClose, onToggle } = {}) => {
  const [isOpen, setIsOpen] = useState(defaultValue);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    onToggle?.();
  }, [onToggle]);

  return { isOpen, open, close, toggle };
};
