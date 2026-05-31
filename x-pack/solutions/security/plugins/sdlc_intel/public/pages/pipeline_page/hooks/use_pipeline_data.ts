/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { SdlcRoadmapGroup } from '../../../../common/api/types';
import { useSdlcApi } from '../../../context/sdlc_api_context';
import {
  filterPipelineRoadmaps,
  type GateStatusFilter,
  type PipelineFilters,
} from '../lib/pipeline_filters';

interface PipelineDataState {
  readonly loading: boolean;
  readonly error?: string;
  readonly roadmaps: readonly SdlcRoadmapGroup[];
}

export const usePipelineData = () => {
  const api = useSdlcApi();
  const [state, setState] = useState<PipelineDataState>({ loading: true, roadmaps: [] });
  const [roadmapId, setRoadmapId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [gateStatus, setGateStatus] = useState<GateStatusFilter>('all');

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
        search: debouncedSearch || undefined,
      })
      .then((response) => {
        if (isMounted) {
          setState({
            loading: false,
            roadmaps: response.roadmaps,
          });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setState({
            loading: false,
            roadmaps: [],
            error: error instanceof Error ? error.message : 'Failed to load pipeline data',
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [api, debouncedSearch]);

  const filters: PipelineFilters = useMemo(
    () => ({
      roadmapId,
      search,
      gateStatus,
    }),
    [roadmapId, search, gateStatus]
  );

  const filteredRoadmaps = useMemo(
    () => filterPipelineRoadmaps(state.roadmaps, filters),
    [filters, state.roadmaps]
  );

  const roadmapTabs = useMemo(
    () =>
      state.roadmaps.map((roadmap) => ({
        id: roadmap.id,
        label: roadmap.title,
      })),
    [state.roadmaps]
  );

  return {
    loading: state.loading,
    error: state.error,
    roadmaps: filteredRoadmaps,
    roadmapTabs,
    filters: {
      roadmapId,
      search,
      gateStatus,
    },
    setRoadmapId,
    setSearch,
    setGateStatus,
  };
};
