/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { SdlcRoadmapsResponse } from '../../../../common/api/types';
import { useSdlcApi } from '../../../context/sdlc_api_context';
import {
  collectOwners,
  collectProducts,
  getFilteredSummary,
  type CoverageFilter,
  type ExecutiveFilters,
} from '../lib/executive_filters';

interface ExecutiveRoadmapsState {
  readonly loading: boolean;
  readonly error?: string;
  readonly response?: SdlcRoadmapsResponse;
}

export const useExecutiveRoadmaps = () => {
  const api = useSdlcApi();
  const [state, setState] = useState<ExecutiveRoadmapsState>({ loading: true });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [product, setProduct] = useState('');
  const [owner, setOwner] = useState('');
  const [coverage, setCoverage] = useState<CoverageFilter>('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [search]);

  useEffect(() => {
    let isMounted = true;

    setState((current) => ({ ...current, loading: true, error: undefined }));

    api
      .getRoadmaps({
        product: product || undefined,
        search: debouncedSearch || undefined,
      })
      .then((response) => {
        if (!isMounted) {
          return;
        }

        if (!response?.summary || !Array.isArray(response.roadmaps)) {
          setState({
            loading: false,
            error: 'Roadmaps API returned an empty or invalid response',
          });
          return;
        }

        setState({ loading: false, response });
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setState({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load executive roadmaps',
        });
      });

    return () => {
      isMounted = false;
    };
  }, [api, debouncedSearch, product]);

  const filters: ExecutiveFilters = useMemo(
    () => ({
      search,
      product,
      owner,
      coverage,
    }),
    [search, product, owner, coverage]
  );

  const filtered = useMemo(() => {
    if (!state.response) {
      return undefined;
    }

    return getFilteredSummary(state.response, filters);
  }, [filters, state.response]);

  const ownerOptions = useMemo(
    () => collectOwners(state.response?.roadmaps ?? []),
    [state.response?.roadmaps]
  );
  const productOptions = useMemo(
    () => collectProducts(state.response?.roadmaps ?? []),
    [state.response?.roadmaps]
  );

  return {
    loading: state.loading,
    error: state.error,
    response: state.response,
    sync: state.response?.sync,
    summary: filtered?.summary,
    derived: filtered?.derived,
    roadmaps: filtered?.roadmaps ?? [],
    ownerOptions,
    productOptions,
    filters: {
      search,
      product,
      owner,
      coverage,
    },
    setSearch,
    setProduct,
    setOwner,
    setCoverage,
  };
};
