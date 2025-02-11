/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import useDebounce from 'react-use/lib/useDebounce';
import { useFetcher } from '@kbn/observability-shared-plugin/public';

import { fetchMonitorManagementList, getMonitorListPageStateWithDefaults } from '../state';

export const useMonitorName = ({ search = '' }: { search?: string }) => {
  const { monitorId } = useParams<{ monitorId: string }>();

  const [debouncedSearch, setDebouncedSearch] = useState<string>(search);
  useDebounce(() => setDebouncedSearch(search), 500, [search]);

  const { loading, data: monitors } = useFetcher(async () => {
    const fetchedResult = await fetchMonitorManagementList(
      getMonitorListPageStateWithDefaults({ query: debouncedSearch })
    );

    return (fetchedResult?.monitors ?? []).map((monitor) => ({
      label: monitor.name,
      key: monitor.config_id,
      locationIds: monitor.locations.map((location) => location.id),
    }));
  }, [debouncedSearch]);

  return useMemo(() => {
    const searchPattern = search.replace(/\s/g, '').toLowerCase();
    const nameAlreadyExists = Boolean(
      (monitors ?? []).some(
        (monitor) =>
          monitorId !== monitor.key &&
          monitor.label.replace(/\s/g, '').toLowerCase() === searchPattern
      )
    );

    return {
      loading: loading || debouncedSearch !== search, // Also keep busy while waiting for debounce
      nameAlreadyExists,
      values: (monitors ?? []).filter((val) => val.key !== monitorId),
    };
  }, [loading, monitorId, monitors, search, debouncedSearch]);
};
