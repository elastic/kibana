/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Routes, Route } from '@kbn/shared-ux-router';
import React from 'react';
import { NoteManagementPage } from '../../../notes';
import { NotFoundPage } from '../../../app/404';
import { MANAGEMENT_ROUTING_NOTES_PATH } from '../../common/constants';

export const NotesContainer = () => {
  return (
    <Routes>
      <Route path={MANAGEMENT_ROUTING_NOTES_PATH} exact component={NoteManagementPage} />
      <Route path="*" component={NotFoundPage} />
    </Routes>
  );
};
