/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import moment from 'moment';

/**
 * Renders a timestamp as a relative "… ago" string and re-renders *itself* on an
 * interval, so keeping the label current doesn't force the parent (e.g. the whole
 * private locations table) to re-render every tick.
 */
export const RelativeTimestamp = ({
  timestamp,
  updateIntervalMs = 30_000,
}: {
  timestamp: number;
  updateIntervalMs?: number;
}) => {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), updateIntervalMs);
    return () => clearInterval(id);
  }, [updateIntervalMs]);

  return <>{moment(timestamp).fromNow()}</>;
};
