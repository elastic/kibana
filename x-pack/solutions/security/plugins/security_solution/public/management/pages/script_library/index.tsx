/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React, { memo } from 'react';
import { MANAGEMENT_ROUTING_SCRIPT_LIBRARY_PATH } from '../../common/constants';
import { NotFoundPage } from '../../../app/404';
import { ScriptLibrary } from './view';

export const ScriptLibraryContainer = memo(() => {
  return (
    <Routes>
      <Route path={MANAGEMENT_ROUTING_SCRIPT_LIBRARY_PATH} exact component={ScriptLibrary} />
      <Route path="*" component={NotFoundPage} />
    </Routes>
  );
});

ScriptLibraryContainer.displayName = 'ScriptLibraryContainer';
