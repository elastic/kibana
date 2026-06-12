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
import {
  mergeEntityResolutionIntoUrlState,
  parseEntityIdentifiersFromUrlParam,
  parseEntityResolutionFromUrlState,
} from '../../../common/components/link_to';
import { UsersTableType } from '../store/model';
import { Users } from './users';
import { UsersDetails } from './details';
import { usersDetailsPagePath, usersDetailsTabPath, usersTabPath } from './constants';

const USERS_DETAILS_TAB_NAMES = `${UsersTableType.authentications}|${UsersTableType.anomalies}|${UsersTableType.events}|${UsersTableType.risk}`;

/** Legacy URLs with a base64 entity segment between user name and tab. */
const usersDetailsLegacyEntityTabPath = `${usersDetailsPagePath}/:legacyEntityIdentifiers/:tabName(${USERS_DETAILS_TAB_NAMES})`;

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
        path={usersDetailsLegacyEntityTabPath}
        render={({
          match: {
            params: { detailName, legacyEntityIdentifiers, tabName },
          },
          location,
        }) => {
          const { entityId, identityFields } =
            parseEntityIdentifiersFromUrlParam(legacyEntityIdentifiers);
          const urlStateQuery = mergeEntityResolutionIntoUrlState(location.search, {
            entityId,
            identityFields,
            displayName: decodeURIComponent(detailName),
            entityType: 'user',
          });
          return (
            <Redirect
              to={{
                pathname: `${USERS_PATH}/name/${detailName}/${tabName}`,
                search: urlStateQuery.replace(/^\?/, ''),
              }}
            />
          );
        }}
      />
      <Route
        path={usersDetailsTabPath}
        render={({
          match: {
            params: { detailName },
          },
          location,
        }) => {
          const { entityId, identityFields } = parseEntityResolutionFromUrlState(location.search);
          return (
            <UsersDetails
              usersDetailsPagePath={usersDetailsPagePath}
              detailName={decodeURIComponent(detailName)}
              entityId={entityId}
              identityFields={identityFields}
            />
          );
        }}
      />
      <Route // Redirect to the first tab when tabName is not present.
        exact
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
