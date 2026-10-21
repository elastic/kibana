/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../common/lib/kibana';

/**
 * Checks whether every selected index pattern exposes a `@timestamp` date field.
 * Each pattern is checked independently so that a pattern without @timestamp is
 * not masked by other patterns that do have it.
 * Returns undefined while loading, true if all patterns have it, false if any do not.
 */
export const useValidateIndexPatternTimestamp = (
  selectedPatterns: Array<EuiComboBoxOptionOption<string>>
) => {
  const { dataViews } = useKibana().services.data;
  const patternKey = selectedPatterns.map((p) => p.label).join(',');
  const enabled = selectedPatterns.length > 0;

  const { data, isFetching } = useQuery(
    ['VALIDATE_INDEX_PATTERN_TIMESTAMP', patternKey],
    async () => {
      const results = await Promise.all(
        selectedPatterns.map(({ label: pattern }) =>
          dataViews
            .getFieldsForWildcard({ pattern, fields: ['@timestamp'] })
            .then((fields) => fields.some((f) => f.name === '@timestamp' && f.type === 'date'))
        )
      );
      return results.every(Boolean);
    },
    {
      enabled,
      keepPreviousData: false,
      refetchOnWindowFocus: false,
    }
  );

  return {
    hasTimestamp: enabled ? data : undefined,
    isLoading: isFetching,
  };
};
