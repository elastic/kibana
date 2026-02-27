/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import {
  decodeEntityIdentifiersFromUrl,
  encodeEntityIdentifiersForUrl,
} from '../../../common/components/link_to/redirect_to_users';
import { USERS_PATH } from '../../../../common/constants';
import { UsersTableType } from '../store/model';
import { Users } from './users';
import { UsersDetails } from './details';
import { usersDetailsPagePath, usersDetailsTabPath, usersTabPath } from './constants';

const parseEntityIdentifiersFromParams = (
  detailName: string,
  encodedSegment: string | undefined
): Record<string, string> => {
  const decoded = encodedSegment ? decodeEntityIdentifiersFromUrl(encodedSegment) : null;
  return decoded ?? { 'user.name': detailName };
};

export const UsersContainer = React.memo(() => {
  return (
    <Routes>
      <Route
        path={usersTabPath}
        render={({
          match: {
            params: { entityIdentifiers: entityIdentifiersSegment },
          },
        }) => <Users encodedEntityIdentifiersSegment={entityIdentifiersSegment} />}
      />
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
            params: { detailName, entityIdentifiers: entityIdentifiersSegment },
          },
        }) => (
          <UsersDetails
            usersDetailsPagePath={usersDetailsPagePath}
            entityIdentifiers={parseEntityIdentifiersFromParams(
              detailName,
              entityIdentifiersSegment
            )}
            encodedEntityIdentifiersSegment={entityIdentifiersSegment}
          />
        )}
      />
      <Route // Redirect to the first tab when tabName is not present.
        path={usersDetailsPagePath}
        render={({
          match: {
            params: { detailName, entityIdentifiers: entityIdentifiersSegment },
          },
          location: { search = '' },
        }) => (
          <Redirect
            to={{
              pathname: `${USERS_PATH}/name/${encodeURIComponent(detailName)}/${
                entityIdentifiersSegment ??
                encodeEntityIdentifiersForUrl({ 'user.name': detailName })
              }/${UsersTableType.events}`,
              search,
            }}
          />
        )}
      />
      <Route // Compatibility redirect for old URL without entityIdentifiers segment: /users/name/:detailName -> add segment and go to events tab.
        path={`${USERS_PATH}/name/:detailName`}
        exact
        render={({
          match: {
            params: { detailName },
          },
          location: { search = '' },
        }) => (
          <Redirect
            to={{
              pathname: `${USERS_PATH}/name/${encodeURIComponent(
                detailName
              )}/${encodeEntityIdentifiersForUrl({ 'user.name': detailName })}/${
                UsersTableType.events
              }`,
              search,
            }}
          />
        )}
      />
      <Route // Compatibility redirect for the old user detail path (without /name/ and without entityIdentifiers segment).
        path={`${USERS_PATH}/:detailName/:tabName?`}
        render={({
          match: {
            params: { detailName, tabName = UsersTableType.events },
          },
          location: { search = '' },
        }) => (
          <Redirect
            to={{
              pathname: `${USERS_PATH}/name/${encodeURIComponent(
                detailName
              )}/${encodeEntityIdentifiersForUrl({ 'user.name': detailName })}/${tabName}`,
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
