/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { useKibana } from './use_kibana';

export const useAuthenticatedUser = () => {
  const {
    services: {
      security: { authc },
    },
  } = useKibana();

  const [user, setUser] = useState<AuthenticatedUser>();
  useEffect(() => {
    // `getCurrentUser` cannot be aborted, so a response that lands after unmount or after `authc`
    // has been replaced is dropped rather than applied to a state this effect no longer owns.
    let isCurrent = true;

    const getCurrentUser = async () => {
      try {
        const authenticatedUser = await authc.getCurrentUser();
        if (isCurrent) {
          setUser(authenticatedUser);
        }
      } catch {
        if (isCurrent) {
          setUser(undefined);
        }
      }
    };

    getCurrentUser();

    return () => {
      isCurrent = false;
    };
  }, [authc]);
  return {
    user,
  };
};
