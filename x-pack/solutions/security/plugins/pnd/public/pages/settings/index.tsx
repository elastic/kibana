/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PlaceholderPage } from '../../components/placeholder_page';
import * as i18n from './translations';

export const SettingsPage: React.FC = () => (
  <PlaceholderPage
    title={i18n.PAGE_TITLE}
    description={i18n.WATCH_ENABLEMENT_NOTE}
    showBackToBrief={false}
  />
);
