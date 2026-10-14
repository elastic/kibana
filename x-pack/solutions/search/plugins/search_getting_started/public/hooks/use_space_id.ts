/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';

import { useKibana } from './use_kibana';

export const useSpaceId = () => {
  const {
    services: { spaces },
  } = useKibana();
  const [spaceId, setSpaceId] = useState<string | undefined>();

  useEffect(() => {
    if (spaces) {
      spaces
        .getActiveSpace()
        .then((space) => setSpaceId(space.id))
        // ignore exceptions and default to no space
        .catch(() => {});
    }
  }, [spaces]);

  return spaceId;
};
