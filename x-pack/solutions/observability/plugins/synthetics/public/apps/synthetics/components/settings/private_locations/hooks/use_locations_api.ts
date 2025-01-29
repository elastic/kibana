/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NewLocation } from '../add_location_flyout';
import {
  createPrivateLocationAction,
  deletePrivateLocationAction,
  getPrivateLocationsAction,
} from '../../../../state/private_locations/actions';
import { selectPrivateLocationsState } from '../../../../state/private_locations/selectors';

export const usePrivateLocationsAPI = () => {
  const dispatch = useDispatch();

  const { loading, createLoading, deleteLoading, data } = useSelector(selectPrivateLocationsState);

  useEffect(() => {
    dispatch(getPrivateLocationsAction.get());
  }, [dispatch]);

  useEffect(() => {
    if (data === null) {
      dispatch(getPrivateLocationsAction.get());
    }
  }, [data, dispatch]);

  const onSubmit = (newLoc: NewLocation) => {
    dispatch(createPrivateLocationAction.get(newLoc));
  };

  const onDelete = (id: string) => {
    dispatch(deletePrivateLocationAction.get(id));
  };

  return {
    onSubmit,
    onDelete,
    deleteLoading,
    loading,
    createLoading,
    privateLocations: data ?? [],
  };
};
