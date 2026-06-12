/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import { HOSTS_PATH } from '../../../../common/constants';
import {
  mergeEntityResolutionIntoUrlState,
  parseEntityIdentifiersFromUrlParam,
  parseEntityResolutionFromUrlState,
} from '../../../common/components/link_to';
import { HostDetails } from './details';
import { HostsTableType } from '../store/model';

import { MlHostConditionalContainer } from '../../../common/components/ml/conditional_links/ml_host_conditional_container';
import { Hosts } from './hosts';
import { hostDetailsPagePath } from './types';

const HOST_DETAILS_TAB_NAMES =
  `${HostsTableType.events}|` +
  `${HostsTableType.authentications}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.risk}|` +
  `${HostsTableType.sessions}`;

const getHostsTabPath = () =>
  `${HOSTS_PATH}/:tabName(` +
  `${HostsTableType.events}|` +
  `${HostsTableType.hosts}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.risk}|` +
  `${HostsTableType.sessions})`;

const getHostDetailsTabPath = () => `${hostDetailsPagePath}/:tabName(${HOST_DETAILS_TAB_NAMES})`;

/** Legacy bookmarked URLs with a base64 entity segment after the tab name. */
const getHostDetailsLegacyEntityTabPath = () =>
  `${hostDetailsPagePath}/:tabName(${HOST_DETAILS_TAB_NAMES})/:legacyEntityIdentifiers`;

export const HostsContainer = React.memo(() => (
  <Routes>
    <Route path={`${HOSTS_PATH}/ml-hosts`}>
      <MlHostConditionalContainer />
    </Route>
    <Route // Compatibility redirect for the old external alert path to events page with external alerts showing.
      path={`${HOSTS_PATH}/externalAlerts`}
      render={({ location: { search = '' } }) => (
        <Redirect
          to={{
            pathname: `${HOSTS_PATH}/${HostsTableType.events}`,
            search: `${search}&onlyExternalAlerts=true`,
          }}
        />
      )}
    />
    <Route path={getHostsTabPath()}>
      <Hosts />
    </Route>
    <Route
      path={getHostDetailsLegacyEntityTabPath()}
      render={({
        match: {
          params: { detailName, tabName, legacyEntityIdentifiers },
        },
        location,
      }) => {
        const { entityId, identityFields } =
          parseEntityIdentifiersFromUrlParam(legacyEntityIdentifiers);
        const urlStateQuery = mergeEntityResolutionIntoUrlState(location.search, {
          entityId,
          identityFields,
          displayName: decodeURIComponent(detailName),
          entityType: 'host',
        });
        return (
          <Redirect
            to={{
              pathname: `${HOSTS_PATH}/name/${detailName}/${tabName}`,
              search: urlStateQuery.replace(/^\?/, ''),
            }}
          />
        );
      }}
    />
    <Route
      path={getHostDetailsTabPath()}
      render={({
        match: {
          params: { detailName },
        },
        location,
      }) => {
        const { entityId, identityFields } = parseEntityResolutionFromUrlState(location.search);
        return (
          <HostDetails
            hostDetailsPagePath={hostDetailsPagePath}
            detailName={decodeURIComponent(detailName)}
            entityId={entityId}
            identityFields={identityFields}
          />
        );
      }}
    />
    <Route // Redirect to the first tab when tabName is not present.
      exact
      path={hostDetailsPagePath}
      render={({
        match: {
          params: { detailName },
        },
        location: { search = '' },
      }) => (
        <Redirect
          to={{
            pathname: `${HOSTS_PATH}/name/${detailName}/${HostsTableType.events}`,
            search,
          }}
        />
      )}
    />
    <Route // Compatibility redirect for the old user detail path.
      path={`${HOSTS_PATH}/:detailName/:tabName?`}
      render={({
        match: {
          params: { detailName, tabName = HostsTableType.events },
        },
        location: { search = '' },
      }) => (
        <Redirect
          to={{
            pathname: `${HOSTS_PATH}/name/${detailName}/${tabName}`,
            search,
          }}
        />
      )}
    />
    <Route // Redirect to the first tab when tabName is not present.
      path={HOSTS_PATH}
      render={({ location: { search = '' } }) => (
        <Redirect to={{ pathname: `${HOSTS_PATH}/${HostsTableType.events}`, search }} />
      )}
    />
  </Routes>
));

HostsContainer.displayName = 'HostsContainer';
