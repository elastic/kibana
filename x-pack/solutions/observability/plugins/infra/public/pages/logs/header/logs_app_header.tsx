/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import React from 'react';
import { useLogsAppHeaderMenu } from './use_logs_app_header_menu';

export interface LogsAppHeaderProps {
  extraItems?: AppHeaderMenu['items'];
  primaryActionItem?: AppHeaderMenu['primaryActionItem'];
  title: string;
}

export const LogsAppHeader = ({
  extraItems,
  primaryActionItem,
  title,
}: LogsAppHeaderProps): React.ReactElement => {
  const { menu, flyouts } = useLogsAppHeaderMenu({ extraItems, primaryActionItem });

  return (
    <>
      <AppHeader title={title} menu={menu} spacing="standard" />
      <EuiSpacer size="l" />
      {flyouts}
    </>
  );
};
