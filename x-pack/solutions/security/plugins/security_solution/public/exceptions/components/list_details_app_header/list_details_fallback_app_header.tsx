/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { SecurityPageName } from '../../../../common/constants';
import { SecurityAppHeader } from '../../../common/components/app_header';
import { useGetSecuritySolutionUrl } from '../../../common/components/link_to';
import * as i18n from './translations';

/**
 * App header of the Exception list details page when the list cannot be shown (error or not found),
 * so the global actions (ML job settings, Add integrations) stay available.
 */
export const ListDetailsFallbackAppHeader = React.memo(() => {
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const back = useMemo(
    () => ({
      label: i18n.BACK_LABEL,
      href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.exceptions }),
    }),
    [getSecuritySolutionUrl]
  );

  return <SecurityAppHeader title={i18n.FALLBACK_TITLE} back={back} spacing="largeBleed" />;
});

ListDetailsFallbackAppHeader.displayName = 'ListDetailsFallbackAppHeader';
