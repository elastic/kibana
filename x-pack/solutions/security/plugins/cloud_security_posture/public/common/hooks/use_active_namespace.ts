/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { LOCAL_STORAGE_NAMESPACE_KEY, DEFAULT_NAMESPACE } from '../constants';

export const useActiveNamespace = ({ postureType }: { postureType: 'cspm' | 'kspm' }) => {
  const [localStorageActiveNamespace, localStorageSetActiveNamespace] = useLocalStorage(
    `${LOCAL_STORAGE_NAMESPACE_KEY}:${postureType}`,
    DEFAULT_NAMESPACE
  );
  const [activeNamespace, setActiveNamespaceState] = useState<string>(
    localStorageActiveNamespace || DEFAULT_NAMESPACE
  );

  const updateActiveNamespace = useCallback(
    (namespace: string) => {
      setActiveNamespaceState(namespace);
      localStorageSetActiveNamespace(namespace);
    },
    [localStorageSetActiveNamespace]
  );
  return { activeNamespace, updateActiveNamespace };
};
