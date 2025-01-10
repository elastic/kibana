/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import { TimelineTypeEnum } from '../../../common/api/timeline';

import { TimelinesPage } from './timelines_page';

import { appendSearch } from '../../common/components/link_to/helpers';
import { useUserPrivileges } from '../../common/components/user_privileges';

import { TIMELINES_PATH } from '../../../common/constants';
import { NoPrivilegesPage } from '../../common/components/no_privileges';

const timelinesPagePath = `${TIMELINES_PATH}/:tabName(${TimelineTypeEnum.default}|${TimelineTypeEnum.template})`;
const timelinesDefaultPath = `${TIMELINES_PATH}/${TimelineTypeEnum.default}`;

export const Timelines = React.memo(() => {
  const {
    timelinePrivileges: { read: canSeeTimelines },
  } = useUserPrivileges();

  return (
    <Routes>
      <Route exact path={timelinesPagePath}>
        {canSeeTimelines ? (
          <TimelinesPage />
        ) : (
          <NoPrivilegesPage docLinkSelector={(docLinks) => docLinks.siem.privileges} />
        )}
      </Route>
      <Route
        path={TIMELINES_PATH}
        render={({ location: { search = '' } }) =>
          canSeeTimelines ? (
            <Redirect to={`${timelinesDefaultPath}${appendSearch(search)}`} />
          ) : (
            <NoPrivilegesPage docLinkSelector={(docLinks) => docLinks.siem.privileges} />
          )
        }
      />
    </Routes>
  );
});

Timelines.displayName = 'Timelines';
