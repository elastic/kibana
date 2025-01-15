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
  selectPrivateLocations,
  selectPrivateLocationsState,
} from '../../../../state/private_locations';

export const usePrivateLocationsAPI = () => {
  const dispatch = useDispatch();

  const privateLocations = useSelector(selectPrivateLocations);
  const { loading, createLoading, deleteLoading } = useSelector(selectPrivateLocationsState);

  useEffect(() => {
    dispatch(getPrivateLocationsAction.get());
  }, [dispatch]);

  const onSubmit = (data: NewLocation) => {
    dispatch(createPrivateLocationAction.get(data));
  };

  const onDelete = (id: string) => {
    dispatch(deletePrivateLocationAction.get(id));
  };

  return {
    onSubmit,
    onDelete,
    deleteLoading,
    loading,
    privateLocations,
    createLoading,
  };
};
