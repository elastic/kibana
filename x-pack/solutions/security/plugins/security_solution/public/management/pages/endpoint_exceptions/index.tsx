/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { NotFoundPage } from '../../../app/404';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { MANAGEMENT_ROUTING_ENDPOINT_EXCEPTIONS_PATH } from '../../common/constants';
import { EndpointExceptions } from './view/endpoint_exceptions';

export const EndpointExceptionsContainer = memo(() => {
  return (
    <TrackApplicationView viewId={SecurityPageName.endpointExceptions}>
      <Routes>
        <Route
          path={MANAGEMENT_ROUTING_ENDPOINT_EXCEPTIONS_PATH}
          exact
          component={EndpointExceptions}
        />
        <Route path="*" component={NotFoundPage} />
      </Routes>
      <SpyRoute pageName={SecurityPageName.endpointExceptions} />
    </TrackApplicationView>
  );
});

EndpointExceptionsContainer.displayName = 'EndpointExceptionsContainer';
