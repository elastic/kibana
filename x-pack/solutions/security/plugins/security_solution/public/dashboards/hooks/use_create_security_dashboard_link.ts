/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSecurityTags } from '../context/dashboard_context';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { SecurityPageName } from '../../../common';

type UseCreateDashboard = () => { isLoading: boolean; url: string };

export const useCreateSecurityDashboardLink: UseCreateDashboard = () => {
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const securityTags = useSecurityTags();
  const url = getSecuritySolutionUrl({
    deepLinkId: SecurityPageName.dashboards,
    path: 'create',
  });
  const result = useMemo(() => {
    const firstSecurityTagId = securityTags?.[0]?.id;
    if (!firstSecurityTagId) {
      return { isLoading: true, url };
    }
    return {
      isLoading: false,
      url,
    };
  }, [securityTags, url]);

  return result;
};
