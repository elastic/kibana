/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiPanel, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { consoleTranslations } from './translations';
import { UserCommandInput } from './user_command_input';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export interface ConsoleInfoProps {
  'data-test-subj'?: string;
}

/**
 * Displays basic information about the console and its usage
 */
export const ConsoleInfo = memo<ConsoleInfoProps>(({ 'data-test-subj': dataTestSubj }) => {
  const getTestId = useTestIdGenerator(dataTestSubj);

  return (
    <EuiFlexGroup
      data-test-subj={getTestId()}
      responsive={false}
      alignItems="center"
      justifyContent="center"
    >
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xxl" />
        <EuiSpacer size="xxl" />
        <EuiPanel
          data-test-subj={getTestId()}
          css={css`
            max-width: 50vw;
            opacity: 0.6;
          `}
        >
          <EuiText size="s" color="subdued">
            <ul>
              <li>
                <FormattedMessage
                  id="xpack.securitySolution.console.consoleInfo.helpCommandInfo"
                  defaultMessage="Enter {command} to see list of available commands"
                  values={{
                    command: <UserCommandInput data-test-subj={getTestId('help')} input="help" />,
                  }}
                />
              </li>

              <li>{consoleTranslations.escapeDoubleDashesInfo}</li>
            </ul>

            <h3>
              <FormattedMessage
                id="xpack.securitySolution.console.consoleInfo.keyboardHelpers"
                defaultMessage="Keyboard helpers"
              />
            </h3>

            <ul>
              <li>{consoleTranslations.keyTabInfo}</li>
              <li>{consoleTranslations.keyUpArrowInfo}</li>
              <li>{consoleTranslations.keyAltSpaceInfo}</li>
            </ul>
          </EuiText>
        </EuiPanel>
        <EuiSpacer size="xxl" />
        <EuiSpacer size="xxl" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
ConsoleInfo.displayName = 'ConsoleInfo';
