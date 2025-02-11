/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import type { InputsModelId } from '../../../common/store/inputs/constants';
import type { inputsModel } from '../../../common/store';
import { inputsActions } from '../../../common/store/actions';

export interface TimelineRefetchProps {
  id: string;
  inputId: InputsModelId.global | InputsModelId.timeline;
  inspect: inputsModel.InspectQuery | null;
  loading: boolean;
  refetch: inputsModel.Refetch;
  skip?: boolean;
}

const TimelineRefetchComponent: React.FC<TimelineRefetchProps> = ({
  id,
  inputId,
  inspect,
  loading,
  refetch,
  skip,
}) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!skip) {
      dispatch(inputsActions.setQuery({ id, inputId, inspect, loading, refetch }));
    }
  }, [dispatch, id, inputId, loading, refetch, inspect, skip]);

  return null;
};

export const TimelineRefetch = React.memo(TimelineRefetchComponent);
