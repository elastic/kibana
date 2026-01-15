/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import React from 'react';
import { EuiText, EuiSpacer, EuiToolTip } from '@elastic/eui';
import { CONSOLE_COMMANDS } from '../../../management/common/translations';
import type { EnabledAutomatedResponseActionsCommands } from '../../../../common/endpoint/service/response_actions/constants';

interface EndpointActionTextProps {
  name: EnabledAutomatedResponseActionsCommands;
  isDisabled: boolean;
}

const EndpointActionTextComponent = ({ name, isDisabled }: EndpointActionTextProps) => {
  const { title, description, tooltip } = useGetCommandText(name);

  const content = (
    <>
      <EuiText size="s">
        <b>{title}</b>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="xs">{description}</EuiText>
    </>
  );
  if (isDisabled) {
    return (
      <EuiToolTip position="top" content={tooltip}>
        {content}
      </EuiToolTip>
    );
  }
  return content;
};

const useGetCommandText = (
  name: EndpointActionTextProps['name']
): { title: ReactNode; description: ReactNode; tooltip: ReactNode } => {
  switch (name) {
    case 'isolate':
      return {
        title: CONSOLE_COMMANDS.isolate.title,
        description: CONSOLE_COMMANDS.isolate.about,
        tooltip: CONSOLE_COMMANDS.isolate.privileges,
      };
    case 'kill-process':
      return {
        title: CONSOLE_COMMANDS.killProcess.title,
        description: CONSOLE_COMMANDS.killProcess.about,
        tooltip: CONSOLE_COMMANDS.killProcess.privileges,
      };
    case 'suspend-process':
      return {
        title: CONSOLE_COMMANDS.suspendProcess.title,
        description: CONSOLE_COMMANDS.suspendProcess.about,
        tooltip: CONSOLE_COMMANDS.suspendProcess.privileges,
      };
    case 'runscript':
      // FIXME:PT RUNSCRIPT: i18n values below
      return {
        title: 'runscript',
        description: 'run a script',
        tooltip: 'some tooltip',
      };
    default:
      return {
        title: '',
        description: '',
        tooltip: '',
      };
  }
};

export const EndpointActionText = React.memo(EndpointActionTextComponent);
