/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu } from '@elastic/eui';
import React from 'react';
import {
  composeSecurityActionMenu,
  type ComposeSecurityActionMenuProps,
} from './compose_security_action_menu';

interface SecurityActionMenuContentProps<
  TActionId extends string = string,
  TGroupId extends string = string
> extends ComposeSecurityActionMenuProps<TActionId, TGroupId> {
  dataTestSubj?: string;
}

export const SecurityActionMenuContent = <TActionId extends string, TGroupId extends string>({
  dataTestSubj,
  ...composeProps
}: SecurityActionMenuContentProps<TActionId, TGroupId>) => {
  const menu = composeSecurityActionMenu(composeProps);

  return <EuiContextMenu initialPanelId={0} panels={menu.panels} data-test-subj={dataTestSubj} />;
};
