/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { EuiDescriptionList, EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ArgNameAndDefinition } from '../service/utils';
import {
  getExclusiveOrArgGroups,
  buildCommandUsageList,
  getOptionalArgs,
  getRequiredArgs,
} from '../service/utils';
import { ConsoleCodeBlock } from './console_code_block';
import type { CommandDefinition } from '../types';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';
import { UnsupportedMessageCallout } from './unsupported_message_callout';

const additionalProps = {
  className: 'euiTruncateText',
};

export interface CommandInputUsageExampleProps {
  commandDef: CommandDefinition;
}

export const CommandInputUsageExample = memo<CommandInputUsageExampleProps>(({ commandDef }) => {
  const helpExample = useMemo(() => {
    if (commandDef.helpExample) {
      return commandDef.helpExample;
    }

    return typeof commandDef.exampleUsage === 'function'
      ? commandDef.exampleUsage()
      : commandDef.exampleUsage;
  }, [commandDef]);

  return (
    helpExample && (
      <EuiDescriptionList
        compressed
        type="column"
        columnWidths={[1, 4]}
        listItems={[
          {
            title: (
              <ConsoleCodeBlock>
                {i18n.translate('xpack.securitySolution.console.commandUsage.exampleUsage', {
                  defaultMessage: 'Example',
                })}
              </ConsoleCodeBlock>
            ),
            description: <ConsoleCodeBlock>{helpExample}</ConsoleCodeBlock>,
          },
        ]}
        descriptionProps={additionalProps}
        titleProps={additionalProps}
      />
    )
  );
});
CommandInputUsageExample.displayName = 'CommandInputUsageExample';

interface CommandInputUsageProps extends Pick<CommandUsageProps, 'commandDef'> {
  /** If the command help example should be displayed. Default is `true`. */
  withHelpExample?: boolean;
}

export const CommandInputUsage = memo<CommandInputUsageProps>(
  ({ commandDef, withHelpExample = true }) => {
    const usageHelp = useMemo(() => {
      if (commandDef.helpUsage) {
        return <ConsoleCodeBlock>{commandDef.helpUsage}</ConsoleCodeBlock>;
      }

      return (
        <>
          {buildCommandUsageList(commandDef).map((usage, index) => {
            return (
              <React.Fragment key={`helpUsage-${index}`}>
                {index > 0 && <EuiSpacer size="xs" />}
                <ConsoleCodeBlock>{usage}</ConsoleCodeBlock>
              </React.Fragment>
            );
          })}
        </>
      );
    }, [commandDef]);

    return (
      <>
        <EuiDescriptionList
          compressed
          type="column"
          columnWidths={[1, 4]}
          listItems={[
            {
              title: (
                <ConsoleCodeBlock>
                  {i18n.translate('xpack.securitySolution.console.commandUsage.inputUsage', {
                    defaultMessage: 'Usage',
                  })}
                </ConsoleCodeBlock>
              ),
              description: usageHelp,
            },
          ]}
          descriptionProps={additionalProps}
          titleProps={additionalProps}
        />
        <EuiSpacer size="s" />
        {withHelpExample && <CommandInputUsageExample commandDef={commandDef} />}
      </>
    );
  }
);
CommandInputUsage.displayName = 'CommandInputUsage';

export interface CommandUsageProps {
  commandDef: CommandDefinition;
  errorMessage?: string;
}

export const CommandUsage = memo<CommandUsageProps>(({ commandDef, errorMessage }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());

  type CommandDetails = Array<{
    title: string;
    description: ReactNode;
  }>;

  const commandOptions = useMemo(() => {
    const toCommandDetails = ({
      name,
      definition: { about },
    }: ArgNameAndDefinition): CommandDetails[number] => {
      return {
        title: `--${name}`,
        description: about,
      };
    };

    return {
      required: getRequiredArgs(commandDef).map(toCommandDetails),
      exclusiveOr: Object.values(getExclusiveOrArgGroups(commandDef)).flat().map(toCommandDetails),
      optional: getOptionalArgs(commandDef, { includeConditionallyRequired: true }).map(
        toCommandDetails
      ),
    };
  }, [commandDef]);

  const parametersDescriptionList = (title: string, parameters: CommandDetails) => {
    const description = parameters.map((item) => (
      <div key={item.title}>
        <ConsoleCodeBlock bold inline>
          {item.title}
        </ConsoleCodeBlock>
        <ConsoleCodeBlock inline>
          {' - '}
          {item.description}
        </ConsoleCodeBlock>
      </div>
    ));
    return (
      <>
        <EuiSpacer size="s" />
        {commandDef.args && (
          <EuiDescriptionList
            compressed
            type="column"
            columnWidths={[1, 4]}
            listItems={[{ title: <ConsoleCodeBlock>{title}</ConsoleCodeBlock>, description }]}
            descriptionProps={additionalProps}
            titleProps={additionalProps}
            data-test-subj={getTestId('commandUsage-options')}
          />
        )}
      </>
    );
  };

  const renderErrorMessage = useCallback(() => {
    if (!errorMessage) {
      return null;
    }
    return (
      <UnsupportedMessageCallout
        header={
          <ConsoleCodeBlock textColor="danger">
            <FormattedMessage
              id="xpack.securitySolution.console.validationError.title"
              defaultMessage="Unsupported action"
            />
          </ConsoleCodeBlock>
        }
        data-test-subj={getTestId('validationError')}
      >
        <div data-test-subj={getTestId('badArgument-message')}>{errorMessage}</div>
        <EuiSpacer size="s" />
      </UnsupportedMessageCallout>
    );
  }, [errorMessage, getTestId]);

  return (
    <EuiPanel paddingSize="none" color="transparent" data-test-subj={getTestId('commandUsage')}>
      {renderErrorMessage()}

      <EuiDescriptionList
        compressed
        type="column"
        columnWidths={[1, 4]}
        listItems={[
          {
            title: (
              <ConsoleCodeBlock>
                {i18n.translate('xpack.securitySolution.console.commandUsage.about', {
                  defaultMessage: 'About',
                })}
              </ConsoleCodeBlock>
            ),
            description: <ConsoleCodeBlock>{commandDef.about}</ConsoleCodeBlock>,
          },
        ]}
        descriptionProps={additionalProps}
        titleProps={additionalProps}
        data-test-subj={getTestId('commandUsage-options')}
      />
      <EuiSpacer size="s" />

      <CommandInputUsage commandDef={commandDef} withHelpExample={false} />

      {commandOptions.required &&
        commandOptions.required.length > 0 &&
        parametersDescriptionList(
          i18n.translate('xpack.securitySolution.console.commandUsage.requiredLabel', {
            defaultMessage: 'Required parameters',
          }),
          commandOptions.required
        )}

      {commandOptions.exclusiveOr &&
        commandOptions.exclusiveOr.length > 0 &&
        parametersDescriptionList(
          i18n.translate('xpack.securitySolution.console.commandUsage.exclusiveOr', {
            defaultMessage: 'Include only one parameter',
          }),
          commandOptions.exclusiveOr
        )}

      {commandOptions.optional &&
        commandOptions.optional.length > 0 &&
        parametersDescriptionList(
          i18n.translate('xpack.securitySolution.console.commandUsage.optional', {
            defaultMessage: 'Optional parameters',
          }),
          commandOptions.optional
        )}

      <EuiSpacer size="s" />
      <CommandInputUsageExample commandDef={commandDef} />
    </EuiPanel>
  );
});
CommandUsage.displayName = 'CommandUsage';
