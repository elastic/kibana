/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';
import { NewLocation } from '../../components/settings/private_locations/add_location_flyout';
import { PrivateLocation, SyntheticsPrivateLocations } from '../../../../../common/runtime_types';
import { createAsyncAction } from '../utils/actions';

export const getPrivateLocationsAction = createAsyncAction<void, SyntheticsPrivateLocations>(
  '[PRIVATE LOCATIONS] GET'
);

export const createPrivateLocationAction = createAsyncAction<NewLocation, PrivateLocation>(
  'CREATE PRIVATE LOCATION'
);

export const deletePrivateLocationAction = createAsyncAction<string, SyntheticsPrivateLocations>(
  'DELETE PRIVATE LOCATION'
);

export const setManageFlyoutOpen = createAction<boolean>('SET MANAGE FLYOUT OPEN');

export const setIsCreatePrivateLocationFlyoutVisible = createAction<boolean>(
  'SET IS CREATE PRIVATE LOCATION FLYOUT VISIBLE'
);
