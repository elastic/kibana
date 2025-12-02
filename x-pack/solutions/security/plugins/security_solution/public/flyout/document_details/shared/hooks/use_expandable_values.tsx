/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

const EMPTY_ARRAY: string[] = [];

interface UseExpandableValuesOptions {
  values: string[] | null | undefined;
  displayValuesLimit?: number;
}

export const useExpandableValues = ({
  values,
  displayValuesLimit = 2,
}: UseExpandableValuesOptions) => {
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  const toggleContentExpansion = useCallback(
    () => setIsContentExpanded((currentIsOpen) => !currentIsOpen),
    []
  );

  const { visibleValues, overflownValues, isContentTooLarge } = useMemo(() => {
    const total = values?.length ?? 0;
    const hasLimit = displayValuesLimit && displayValuesLimit > 0 && displayValuesLimit < total;

    if (!values || total === 0) {
      return {
        visibleValues: EMPTY_ARRAY,
        overflownValues: EMPTY_ARRAY,
        isContentTooLarge: false,
      };
    }

    if (!hasLimit) {
      return {
        visibleValues: values,
        overflownValues: EMPTY_ARRAY,
        isContentTooLarge: false,
      };
    }

    return {
      visibleValues: values.slice(0, displayValuesLimit),
      overflownValues: values.slice(displayValuesLimit),
      isContentTooLarge: true,
    };
  }, [values, displayValuesLimit]);

  const hasMultipleValues = (values?.length ?? 0) > 1;

  return {
    visibleValues,
    overflownValues,
    isContentExpanded,
    isContentTooLarge,
    hasMultipleValues,
    toggleContentExpansion,
  };
};
