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
import {
  buildPipelineDisplayGroups,
  buildOrgTeamScopeOptions,
  buildProductRoadmapScopeOptions,
  buildSubteamScopeOptions,
  DEFAULT_PIPELINE_SCOPE,
  type PipelineScope,
} from '../lib/pipeline_scope';

interface PipelineDataState {
  readonly loading: boolean;
  readonly error?: string;
  readonly roadmaps: readonly SdlcRoadmapGroup[];
}

export const usePipelineData = () => {
  const api = useSdlcApi();
  const [state, setState] = useState<PipelineDataState>({ loading: true, roadmaps: [] });
  const [scope, setScope] = useState<PipelineScope>(DEFAULT_PIPELINE_SCOPE);
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
      search,
      gateStatus,
    }),
    [search, gateStatus]
  );

  const displayRoadmaps = useMemo(
    () => buildPipelineDisplayGroups(state.roadmaps, scope),
    [scope, state.roadmaps]
  );

  const filteredRoadmaps = useMemo(
    () => filterPipelineRoadmaps(displayRoadmaps, filters),
    [displayRoadmaps, filters]
  );

  const orgTeamOptions = useMemo(() => buildOrgTeamScopeOptions(), []);
  const subteamOptions = useMemo(() => buildSubteamScopeOptions(scope.orgTeamKey), [scope.orgTeamKey]);
  const productRoadmapOptions = useMemo(() => buildProductRoadmapScopeOptions(), []);

  const setOrgTeamKey = (orgTeamKey: string) => {
    setScope((current) => ({
      ...current,
      orgTeamKey,
      subteamKey: '',
    }));
  };

  const setSubteamKey = (subteamKey: string) => {
    setScope((current) => ({
      ...current,
      subteamKey,
    }));
  };

  const setProductRoadmapId = (productRoadmapId: string) => {
    setScope((current) => ({
      ...current,
      productRoadmapId,
    }));
  };

  return {
    loading: state.loading,
    error: state.error,
    roadmaps: filteredRoadmaps,
    scope,
    orgTeamOptions,
    subteamOptions,
    productRoadmapOptions,
    filters: {
      search,
      gateStatus,
    },
    setOrgTeamKey,
    setSubteamKey,
    setProductRoadmapId,
    setSearch,
    setGateStatus,
  };
};
