/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { InputsModelId } from '../../store/inputs/constants';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';
import { inputsActions } from '../../store/actions';

interface UseInspectModalProps {
  inputId?: InputsModelId.global | InputsModelId.timeline;
  inspectIndex?: number;
  isDisabled?: boolean;
  multiple?: boolean;
  onClick?: () => void;
  onCloseInspect?: () => void;
  queryId: string;
}

export const useInspect = ({
  inputId = InputsModelId.global,
  inspectIndex = 0,
  isDisabled,
  multiple = false, // If multiple = true we ignore the inspectIndex and pass all requests and responses to the inspect modal
  onClick,
  onCloseInspect,
  queryId,
}: UseInspectModalProps) => {
  const dispatch = useDispatch();

  const getGlobalQuery = useMemo(() => inputsSelectors.globalQueryByIdSelector(), []);
  const getTimelineQuery = useMemo(() => inputsSelectors.timelineQueryByIdSelector(), []);
  const { loading, inspect, selectedInspectIndex, isInspected, searchSessionId } =
    useDeepEqualSelector((state) =>
      inputId === InputsModelId.global
        ? getGlobalQuery(state, queryId)
        : getTimelineQuery(state, queryId)
    );

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    }
    dispatch(
      inputsActions.setInspectionParameter({
        id: queryId,
        inputId,
        isInspected: true,
        selectedInspectIndex: inspectIndex,
        searchSessionId,
      })
    );
  }, [onClick, dispatch, queryId, inputId, inspectIndex, searchSessionId]);

  const handleCloseModal = useCallback(() => {
    if (onCloseInspect != null) {
      onCloseInspect();
    }
    dispatch(
      inputsActions.setInspectionParameter({
        id: queryId,
        inputId,
        isInspected: false,
        selectedInspectIndex: inspectIndex,
        searchSessionId,
      })
    );
  }, [onCloseInspect, dispatch, queryId, inputId, inspectIndex, searchSessionId]);

  const request = useMemo(() => {
    if (inspect != null && inspect.dsl.length > 0) {
      if (multiple) {
        return inspect.dsl[0];
      } else {
        return inspect.dsl[inspectIndex];
      }
    }
    return null;
  }, [inspectIndex, multiple, inspect]);

  const additionalRequests = useMemo(() => {
    if (multiple) {
      return inspect?.dsl.slice(1);
    } else {
      return null;
    }
  }, [multiple, inspect]);

  const response = useMemo(() => {
    if (inspect != null && inspect.response.length > 0) {
      if (multiple) {
        return inspect.response[0];
      } else {
        return inspect.response[inspectIndex];
      }
    }
    return null;
  }, [inspectIndex, multiple, inspect]);

  const additionalResponses = useMemo(() => {
    if (multiple) {
      return inspect?.response.slice(1);
    } else {
      return null;
    }
  }, [multiple, inspect]);

  const isShowingModal = useMemo(
    () => !loading && selectedInspectIndex === inspectIndex && isInspected,
    [inspectIndex, isInspected, loading, selectedInspectIndex]
  );

  const isButtonDisabled = useMemo(
    () => loading || isDisabled || request == null || response == null || queryId == null,
    [isDisabled, loading, queryId, request, response]
  );

  return {
    additionalRequests,
    additionalResponses,
    handleClick,
    handleCloseModal,
    isButtonDisabled,
    isShowingModal,
    loading,
    request,
    response,
  };
};
