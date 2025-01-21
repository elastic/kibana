/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import { useCallback, useRef, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { ISessionService } from '@kbn/data-plugin/public';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { useKibana } from '../../lib/kibana';
import { inputsSelectors } from '../../store';
import { inputsActions } from '../../store/actions';
import { InputsModelId } from '../../store/inputs/constants';
import type { Refetch } from '../../store/inputs/model';

interface UseRefetchByRestartingSessionProps {
  inputId?: InputsModelId;
  queryId: string;
}

export const useRefetchByRestartingSession = ({
  inputId,
  queryId,
}: UseRefetchByRestartingSessionProps): {
  session: MutableRefObject<ISessionService>;
  refetchByRestartingSession: Refetch;
  refetchByDeletingSession: Refetch;
} => {
  const dispatch = useDispatch();
  const { data } = useKibana().services;

  const session = useRef(data.search.session);

  const getGlobalQuery = useMemo(() => inputsSelectors.globalQueryByIdSelector(), []);
  const getTimelineQuery = useMemo(() => inputsSelectors.timelineQueryByIdSelector(), []);
  const { selectedInspectIndex } = useDeepEqualSelector((state) =>
    inputId === InputsModelId.global
      ? getGlobalQuery(state, queryId)
      : getTimelineQuery(state, queryId)
  );

  const refetchByRestartingSession = useCallback(() => {
    const searchSessionId = session.current.start();
    dispatch(
      inputsActions.setInspectionParameter({
        id: queryId,
        selectedInspectIndex,
        isInspected: false,
        inputId: InputsModelId.global,
        /** Lens Embeddables do not have a function we can call to refetch data
         * like most of our components, it refetches when receiving a new search
         * session ID.
         **/
        searchSessionId,
      })
    );
  }, [dispatch, queryId, selectedInspectIndex]);

  /**
   * This is for refetching alert index when the first rule just created
   */
  const refetchByDeletingSession = useCallback(() => {
    dispatch(inputsActions.deleteOneQuery({ inputId: InputsModelId.global, id: queryId }));
  }, [dispatch, queryId]);

  return {
    session,
    refetchByRestartingSession,
    refetchByDeletingSession,
  };
};
