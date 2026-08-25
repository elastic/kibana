/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useQueryIndices } from './use_query_indices';

export const useIndicesValidation = (unvalidatedIndices: string[]) => {
  const [isValidated, setIsValidated] = useState<boolean>(false);
  const [validIndices, setValidIndices] = useState<string[]>([]);
  const { indices, isFetched: isIndicesLoaded } = useQueryIndices({
    query: unvalidatedIndices.join(','),
    exact: true,
  });

  useEffect(() => {
    if (isIndicesLoaded) {
      setValidIndices(indices.filter((index) => unvalidatedIndices.includes(index)));
      setIsValidated(true);
    }
  }, [unvalidatedIndices, indices, isIndicesLoaded]);

  return { isValidated, validIndices };
};
