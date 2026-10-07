/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EngineActivityPanel } from './engine_activity_panel';
import { WorkspaceDrawer } from './workspace_drawer';

export const engineDrawerLabels = {
  title: i18n.translate('xpack.significantEventsApp.engineDrawer.title', {
    defaultMessage: 'Engine',
  }),
  scope: i18n.translate('xpack.significantEventsApp.engineDrawer.scope', {
    defaultMessage: 'Live engine activity, discovery runs and recorded steps.',
  }),
};

export const EngineDrawer = ({ onClose }: { onClose: () => void }): React.ReactElement => (
  <WorkspaceDrawer
    title={engineDrawerLabels.title}
    description={engineDrawerLabels.scope}
    onClose={onClose}
    testSubject="detectionEngineDrawer"
  >
    <EngineActivityPanel expanded />
  </WorkspaceDrawer>
);
