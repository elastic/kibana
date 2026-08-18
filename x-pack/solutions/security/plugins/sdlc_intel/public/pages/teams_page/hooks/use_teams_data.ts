/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { SdlcSubteamCard, SdlcTeamsResponse } from '../../../../common/api/types';
import { useSdlcApi } from '../../../context/sdlc_api_context';
import { computeAverageTeamsPerEpic } from '../lib/team_epic_utils';
import { formatSubteamSelectionKey } from '@kbn/sdlc-data-layer';

interface TeamsDataState {
  readonly loading: boolean;
  readonly error?: string;
  readonly data?: SdlcTeamsResponse;
}

export const useTeamsData = () => {
  const api = useSdlcApi();
  const [state, setState] = useState<TeamsDataState>({ loading: true });
  const [selectedTeamKey, setSelectedTeamKey] = useState<string | undefined>();
  const [selectedSubteamKey, setSelectedSubteamKey] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;

    api
      .getTeams()
      .then((data) => {
        if (isMounted) {
          setState({ loading: false, data });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load teams dashboard data',
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [api]);

  const membersTotal = useMemo(
    () => state.data?.teams.reduce((sum, team) => sum + team.membersCount, 0) ?? 0,
    [state.data?.teams]
  );

  const averageTeamsPerEpic = useMemo(
    () => computeAverageTeamsPerEpic(state.data?.epicsByTeam ?? {}),
    [state.data?.epicsByTeam]
  );

  const subteamsForSelectedOrg = useMemo((): readonly SdlcSubteamCard[] => {
    if (!selectedTeamKey || !state.data?.subteamsByOrgTeam) {
      return [];
    }
    return state.data.subteamsByOrgTeam[selectedTeamKey] ?? [];
  }, [selectedTeamKey, state.data?.subteamsByOrgTeam]);

  const selectedSubteam = useMemo(
    () => subteamsForSelectedOrg.find((subteam) => subteam.key === selectedSubteamKey),
    [subteamsForSelectedOrg, selectedSubteamKey]
  );

  const selectedEpics = useMemo(() => {
    if (!selectedTeamKey || !state.data) {
      return [];
    }

    if (selectedSubteamKey) {
      const selectionKey = formatSubteamSelectionKey({
        orgTeamKey: selectedTeamKey,
        subteamKey: selectedSubteamKey,
      });
      return state.data.epicsBySubteam[selectionKey] ?? [];
    }

    return state.data.epicsByTeam[selectedTeamKey] ?? [];
  }, [selectedTeamKey, selectedSubteamKey, state.data]);

  const handleSelectTeam = (teamKey: string) => {
    setSelectedTeamKey(teamKey);
    setSelectedSubteamKey(undefined);
  };

  return {
    loading: state.loading,
    error: state.error,
    summary: state.data?.summary,
    teams: state.data?.teams ?? [],
    matrix: state.data?.matrix,
    membersTotal,
    averageTeamsPerEpic,
    selectedTeamKey,
    selectedSubteamKey,
    selectedSubteam,
    subteamsForSelectedOrg,
    selectedEpics,
    setSelectedTeamKey: handleSelectTeam,
    setSelectedSubteamKey,
    clearSelectedTeam: () => {
      setSelectedTeamKey(undefined);
      setSelectedSubteamKey(undefined);
    },
    clearSelectedSubteam: () => setSelectedSubteamKey(undefined),
  };
};
