/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { AuthenticatedUser } from '@kbn/core/public';
import { useKibana } from './use_kibana';

export const useCurrentUser = () => {
  const {
    services: { security },
  } = useKibana();

  const [user, setUser] = useState<AuthenticatedUser>();

  useEffect(() => {
    const loadUser = async () => {
      const loadedUser = await security.authc.getCurrentUser();
      setUser(loadedUser);
    };
    loadUser().catch(() => {
      setUser(undefined);
    });
  }, [security]);

  return user;
};
