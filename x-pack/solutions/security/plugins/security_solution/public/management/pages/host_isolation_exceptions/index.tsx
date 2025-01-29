/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Routes, Route } from '@kbn/shared-ux-router';
import React, { memo } from 'react';
import { SecurityPageName } from '../../../../common/constants';
import { useLinkExists } from '../../../common/links/links';
import { MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH } from '../../common/constants';
import { NotFoundPage } from '../../../app/404';
import { HostIsolationExceptionsList } from './view/host_isolation_exceptions_list';
import { NoPrivilegesPage } from '../../../common/components/no_privileges';

/**
 * Provides the routing container for the hosts related views
 */
export const HostIsolationExceptionsContainer = memo(() => {
  const canAccessHostIsolationExceptionsLink = useLinkExists(
    SecurityPageName.hostIsolationExceptions
  );
  if (!canAccessHostIsolationExceptionsLink) {
    // TODO: Render a license/productType upsell page
    return (
      <NoPrivilegesPage docLinkSelector={({ securitySolution }) => securitySolution.privileges} />
    );
  }

  return (
    <Routes>
      <Route
        path={MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH}
        exact
        component={HostIsolationExceptionsList}
      />
      <Route path="*" component={NotFoundPage} />
    </Routes>
  );
});

HostIsolationExceptionsContainer.displayName = 'HostIsolationExceptionsContainer';
