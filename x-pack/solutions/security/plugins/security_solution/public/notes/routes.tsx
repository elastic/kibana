/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { NoteManagementPage } from './pages/note_management_page';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { NotFoundPage } from '../app/404';
import { NOTES_PATH, SecurityPageName } from '../../common/constants';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

const NotesManagementTelemetry = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.notes}>
      <NoteManagementPage />
      <SpyRoute pageName={SecurityPageName.notes} />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

const NotesManagementContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route path={NOTES_PATH} exact component={NotesManagementTelemetry} />
      <Route component={NotFoundPage} />
    </Routes>
  );
});
NotesManagementContainer.displayName = 'NotesManagementContainer';

export const routes = [
  {
    path: NOTES_PATH,
    component: NotesManagementContainer,
  },
];
