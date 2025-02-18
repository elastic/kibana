/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiToolTipProps } from '@elastic/eui';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const UNSUPPORTED_COMMAND_INFO = i18n.translate(
  'xpack.securitySolution.endpointConsoleCommands.suspendProcess.unsupportedCommandInfo',
  {
    defaultMessage:
      'This version of the Endpoint does not support this command. Upgrade your Agent in Fleet to use the latest response actions.',
  }
);

export const getCommandAboutInfo = ({
  aboutInfo,
  isSupported,
  tooltipContent = UNSUPPORTED_COMMAND_INFO,
  dataTestSubj,
}: {
  aboutInfo: React.ReactNode;
  isSupported: boolean;
  tooltipContent?: EuiToolTipProps['content'];
  dataTestSubj?: string;
}) => {
  return isSupported ? (
    aboutInfo
  ) : (
    <>
      {aboutInfo}{' '}
      <EuiIconTip
        anchorProps={{ 'data-test-subj': dataTestSubj }}
        content={tooltipContent}
        type="warning"
        color="danger"
      />
    </>
  );
};
