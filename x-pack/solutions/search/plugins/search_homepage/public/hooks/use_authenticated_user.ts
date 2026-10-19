/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import { useKibana } from './use_kibana';

const CLOUD_USER_ADMIN_ROLE = 'admin';

export const useAuthenticatedUser = () => {
  const {
    services: {
      security: { authc },
    },
  } = useKibana();

  const [user, setUser] = useState<AuthenticatedUser>();
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const authenticatedUser = await authc.getCurrentUser();
        setUser(authenticatedUser);
      } catch {
        setUser(undefined);
      }
    };

    getCurrentUser();
  }, [authc]);
  return {
    user,
    isAdmin: user?.roles.includes(CLOUD_USER_ADMIN_ROLE) ?? false,
    // TODO: treat everyone as a billing admin until we can check billing access. The
    // `_ec_billing_admin` role doesn't reach Kibana on Serverless and was never set on ECH:
    // https://github.com/elastic/kibana-team/issues/4343
    isBillingAdmin: true,
  };
};
