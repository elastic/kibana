/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { LocationStatusBadges } from '../../common/components/location_status_badges';
import { EncryptedSyntheticsSavedMonitor } from '../../../../../../common/runtime_types';
import { useStatusByLocation } from '../../../hooks/use_status_by_location';

export const LocationsStatus = ({
  configId,
  monitorLocations,
}: {
  configId: string;
  monitorLocations?: EncryptedSyntheticsSavedMonitor['locations'];
}) => {
  const { locations, loading } = useStatusByLocation({ configId, monitorLocations });

  return <LocationStatusBadges configId={configId} locations={locations} loading={loading} />;
};
