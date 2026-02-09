/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from '../../../common/lib/kibana';

export interface UseExpandSectionParams {
  /**
   * Title of the section
   */
  title: string;
  /**
   * Default value for the section
   */
  defaultValue: boolean;
  /**
   * StorageKey to save value in specific flyout
   */
  storageKey: string;
}

/**
 * Hook to get the expanded state of a section from local storage.
 */
export const useExpandSection = ({ storageKey, title, defaultValue }: UseExpandSectionParams) => {
  const { storage } = useKibana().services;

  return useMemo(() => {
    const localStorage = storage.get(storageKey);
    const key = title.toLowerCase();
    const expanded =
      localStorage && localStorage[key] !== undefined ? localStorage[key] : defaultValue;
    return expanded;
  }, [storage, storageKey, title, defaultValue]);
};
