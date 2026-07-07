/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { NoteManagementPage } from './pages/note_management_page';
import { NotFoundPage } from '../app/404';
import { NOTES_PATH, SecurityPageName } from '../../common/constants';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';

const NotesManagementWrapper = () => (
  <PluginTemplateWrapper>
    <NoteManagementPage />
  </PluginTemplateWrapper>
);

const NotesManagementContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route path={NOTES_PATH} exact component={NotesManagementWrapper} />
      <Route component={NotFoundPage} />
    </Routes>
  );
});
NotesManagementContainer.displayName = 'NotesManagementContainer';

export const routes = [
  {
    path: NOTES_PATH,
    component: withSecurityRoutePageWrapper(NotesManagementContainer, SecurityPageName.notes),
  },
];
