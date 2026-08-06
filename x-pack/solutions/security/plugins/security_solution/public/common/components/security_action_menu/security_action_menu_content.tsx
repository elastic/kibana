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

interface SecurityActionMenuContentProps extends ComposeSecurityActionMenuProps {
  dataTestSubj?: string;
}

export const SecurityActionMenuContent = ({
  dataTestSubj,
  ...composeProps
}: SecurityActionMenuContentProps) => {
  const menu = composeSecurityActionMenu(composeProps);

  return <EuiContextMenu initialPanelId={0} panels={menu.panels} data-test-subj={dataTestSubj} />;
};
