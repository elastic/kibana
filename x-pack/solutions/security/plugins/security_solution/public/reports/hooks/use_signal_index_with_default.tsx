/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import { useSpaceId } from '../../common/hooks/use_space_id';

export const useSignalIndexWithDefault = () => {
  const { signalIndexName } = useSignalIndex();
  const spaceId = useSpaceId();
  const alertsIndex = useMemo(() => {
    return signalIndexName ?? `.alerts-security.alerts-${spaceId}`;
  }, [signalIndexName, spaceId]);
  return alertsIndex;
};
