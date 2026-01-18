/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useMemo } from 'react';
import type { Capabilities } from '@kbn/core/types';
import { RULES_UI_EDIT, RULES_UI_READ } from '@kbn/security-solution-features/constants';
import { SECURITY_FEATURE_ID, RULES_FEATURE_ID } from '../../../../common/constants';
import { useFetchListPrivileges } from '../../../detections/components/user_privileges/use_fetch_list_privileges';
import { useFetchDetectionEnginePrivileges } from '../../../detections/components/user_privileges/use_fetch_detection_engine_privileges';
import { getEndpointPrivilegesInitialState, useEndpointPrivileges } from './endpoint';
import type { EndpointPrivileges } from '../../../../common/endpoint/types';
import { extractTimelineCapabilities } from '../../utils/timeline_capabilities';
import { extractNotesCapabilities } from '../../utils/notes_capabilities';

export interface UserPrivilegesState {
  listPrivileges: ReturnType<typeof useFetchListPrivileges>;
  detectionEnginePrivileges: ReturnType<typeof useFetchDetectionEnginePrivileges>;
  endpointPrivileges: EndpointPrivileges;
  siemPrivileges: { crud: boolean; read: boolean };
  timelinePrivileges: { crud: boolean; read: boolean };
  notesPrivileges: { crud: boolean; read: boolean };
  rulesPrivileges: { read: boolean; edit: boolean };
}

export const initialUserPrivilegesState = (): UserPrivilegesState => ({
  listPrivileges: { loading: false, error: undefined, result: undefined },
  detectionEnginePrivileges: { loading: false, error: undefined, result: undefined },
  endpointPrivileges: getEndpointPrivilegesInitialState(),
  siemPrivileges: { crud: false, read: false },
  timelinePrivileges: { crud: false, read: false },
  notesPrivileges: { crud: false, read: false },
  rulesPrivileges: { read: false, edit: false },
});
export const UserPrivilegesContext = createContext<UserPrivilegesState>(
  initialUserPrivilegesState()
);

interface UserPrivilegesProviderProps {
  kibanaCapabilities: Capabilities;
  children: React.ReactNode;
}

export const UserPrivilegesProvider = ({
  kibanaCapabilities,
  children,
}: UserPrivilegesProviderProps) => {
  const crud: boolean = kibanaCapabilities[SECURITY_FEATURE_ID].crud === true;
  const read: boolean = kibanaCapabilities[SECURITY_FEATURE_ID].show === true;

  const rulesCapabilities = kibanaCapabilities[RULES_FEATURE_ID];
  const readRules = rulesCapabilities?.[RULES_UI_READ] === true;
  const editRules = rulesCapabilities?.[RULES_UI_EDIT] === true;

  const shouldFetchListPrivileges = read || readRules;

  const listPrivileges = useFetchListPrivileges(shouldFetchListPrivileges);
  const detectionEnginePrivileges = useFetchDetectionEnginePrivileges();
  const endpointPrivileges = useEndpointPrivileges();

  const siemPrivileges = useMemo(
    () => ({
      crud,
      read,
    }),
    [crud, read]
  );

  const timelinePrivileges = useMemo(
    () => extractTimelineCapabilities(kibanaCapabilities),
    [kibanaCapabilities]
  );

  const notesPrivileges = useMemo(
    () => extractNotesCapabilities(kibanaCapabilities),
    [kibanaCapabilities]
  );

  const rulesPrivileges = useMemo(() => {
    return {
      read: readRules,
      edit: editRules,
    };
  }, [readRules, editRules]);

  const contextValue = useMemo(
    () => ({
      listPrivileges,
      detectionEnginePrivileges,
      endpointPrivileges,
      siemPrivileges,
      timelinePrivileges,
      notesPrivileges,
      rulesPrivileges,
    }),
    [
      listPrivileges,
      detectionEnginePrivileges,
      endpointPrivileges,
      siemPrivileges,
      timelinePrivileges,
      notesPrivileges,
      rulesPrivileges,
    ]
  );

  return (
    <UserPrivilegesContext.Provider value={contextValue}>{children}</UserPrivilegesContext.Provider>
  );
};
