/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import { USERS_PATH } from '../../../../common/constants';
import { UsersTableType } from '../store/model';
import { Users } from './users';
import { UsersDetails } from './details';
import { usersDetailsPagePath, usersDetailsTabPath, usersTabPath } from './constants';

export const UsersContainer = React.memo(() => {
  return (
    <Routes>
      <Route path={usersTabPath}>
        <Users />
      </Route>
      <Route // Compatibility redirect for the old external alert path to events page with external alerts showing.
        path={`${USERS_PATH}/externalAlerts`}
        render={({ location: { search = '' } }) => (
          <Redirect
            to={{
              pathname: `${USERS_PATH}/${UsersTableType.events}`,
              search: `${search}&onlyExternalAlerts=true`,
            }}
          />
        )}
      />
      <Route
        path={usersDetailsTabPath}
        render={({
          match: {
            params: { detailName },
          },
        }) => (
          <UsersDetails
            usersDetailsPagePath={usersDetailsPagePath}
            detailName={decodeURIComponent(detailName)}
          />
        )}
      />
      <Route // Redirect to the first tab when tabName is not present.
        path={usersDetailsPagePath}
        render={({
          match: {
            params: { detailName },
          },
          location: { search = '' },
        }) => (
          <Redirect
            to={{
              pathname: `${USERS_PATH}/name/${detailName}/${UsersTableType.events}`,
              search,
            }}
          />
        )}
      />

      <Route // Compatibility redirect for the old user detail path.
        path={`${USERS_PATH}/:detailName/:tabName?`}
        render={({
          match: {
            params: { detailName, tabName = UsersTableType.events },
          },
          location: { search = '' },
        }) => (
          <Redirect
            to={{
              pathname: `${USERS_PATH}/name/${detailName}/${tabName}`,
              search,
            }}
          />
        )}
      />
      <Route // Redirect to the first tab when tabName is not present.
        path={USERS_PATH}
        render={({ location: { search = '' } }) => (
          <Redirect to={{ pathname: `${USERS_PATH}/${UsersTableType.events}`, search }} />
        )}
      />
    </Routes>
  );
});

UsersContainer.displayName = 'UsersContainer';
