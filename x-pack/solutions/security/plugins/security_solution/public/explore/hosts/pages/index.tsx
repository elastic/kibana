/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import { decodeEntityIdentifiersFromUrl } from '../../../common/components/link_to/redirect_to_users';
import { HOSTS_PATH } from '../../../../common/constants';
import { HostDetails } from './details';
import { HostsTableType } from '../store/model';

import { MlHostConditionalContainer } from '../../../common/components/ml/conditional_links/ml_host_conditional_container';
import { Hosts } from './hosts';
import {
  hostDetailsPagePath,
  hostDetailsPagePathWithEntityIdentifiers,
  hostDetailsPagePathWithEntityIdentifiersSegment,
} from './types';

const parseEntityIdentifiersFromParams = (
  detailName: string,
  entityIdentifiersSegment: string | undefined
): Record<string, string> => {
  const decoded = entityIdentifiersSegment
    ? decodeEntityIdentifiersFromUrl(entityIdentifiersSegment)
    : null;
  return decoded ?? { 'host.name': decodeURIComponent(detailName) };
};

const getHostsTabPath = () =>
  `${HOSTS_PATH}/:tabName(` +
  `${HostsTableType.events}|` +
  `${HostsTableType.hosts}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.risk}|` +
  `${HostsTableType.sessions})`;

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
      path={hostDetailsPagePathWithEntityIdentifiersSegment}
      render={({
        match: {
          params: { detailName, entityIdentifiers: entityIdentifiersSegment },
        },
      }) => (
        <HostDetails
          detailName={decodeURIComponent(detailName)}
          hostDetailsPagePath={hostDetailsPagePath}
          entityIdentifiers={parseEntityIdentifiersFromParams(detailName, entityIdentifiersSegment)}
        />
      )}
    />
    <Route
      path={hostDetailsPagePathWithEntityIdentifiers}
      render={({
        match: {
          params: { detailName },
        },
      }) => (
        <HostDetails
          detailName={decodeURIComponent(detailName)}
          hostDetailsPagePath={hostDetailsPagePath}
          entityIdentifiers={parseEntityIdentifiersFromParams(detailName, undefined)}
        />
      )}
    />
    <Route // Compatibility: old format had entityIdentifiers before tabName. Redirect to entityIdentifiers after tabName.
      path={`${HOSTS_PATH}/name/:detailName/:entityIdentifiersSegment/:tabName`}
      render={({
        match: {
          params: { detailName, entityIdentifiersSegment, tabName },
        },
        location: { search = '' },
      }) => (
        <Redirect
          to={{
            pathname: `${HOSTS_PATH}/name/${detailName}/${tabName}/${entityIdentifiersSegment}`,
            search,
          }}
        />
      )}
    />
    <Route // Compatibility: old format had entityIdentifiers without tab. Redirect to events tab.
      path={`${HOSTS_PATH}/name/:detailName/:entityIdentifiersSegment`}
      render={({
        match: {
          params: { detailName, entityIdentifiersSegment },
        },
        location: { search = '' },
      }) => (
        <Redirect
          to={{
            pathname: `${HOSTS_PATH}/name/${detailName}/${HostsTableType.events}/${entityIdentifiersSegment}`,
            search,
          }}
        />
      )}
    />
    <Route // Redirect to the first tab when tabName is not present.
      path={`${HOSTS_PATH}/name/:detailName`}
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
