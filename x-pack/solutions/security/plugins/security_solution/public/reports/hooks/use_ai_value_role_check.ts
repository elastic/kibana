/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useCurrentUser } from '../../common/lib/kibana';

/**
 * Hook to check if the current user has the required roles to access the AI Value page.
 * Only admin and soc_manager roles are allowed in the complete tier.
 */
export const useAiValueRoleCheck = (): { hasRequiredRole: boolean; isLoading: boolean } => {
  const currentUser = useCurrentUser();

  return useMemo(() => {
    if (!currentUser) {
      return { hasRequiredRole: false, isLoading: true };
    }

    const userRoles = currentUser.roles || [];
    const allowedRoles = ['admin', 'soc_manager', '_search_ai_lake_soc_manager'];

    const hasRequiredRole = allowedRoles.some((role) => userRoles.includes(role));

    return { hasRequiredRole, isLoading: false };
  }, [currentUser]);
};
