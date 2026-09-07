/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiHeader,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiPage,
  EuiPageBody,
  EuiTitle,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { AppNavigation, AppTitle } from './app_navigation';
import { SdlcIntelRoutes } from '../routes';

export const SdlcIntelApp = ({ coreStart }: { coreStart: CoreStart }) => (
  <EuiPage paddingSize="none" direction="column" grow>
    <EuiHeader>
      <EuiHeaderSection grow={false}>
        <EuiHeaderSectionItem>
          <EuiTitle size="xs">
            <h1>
              <AppTitle />
            </h1>
          </EuiTitle>
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
      <EuiHeaderSection>
        <AppNavigation coreStart={coreStart} />
      </EuiHeaderSection>
    </EuiHeader>
    <EuiPageBody paddingSize="none" component="main">
      <SdlcIntelRoutes />
    </EuiPageBody>
  </EuiPage>
);
