/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { reduce } from 'lodash';
import { ActionResponseOutputs } from './action_response_outputs';
import { getAgentTypeName } from '../../../../common/translations';
import { RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP } from '../../../../../common/endpoint/service/response_actions/constants';
import { OUTPUT_MESSAGES } from '../translations';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { type ActionDetails, type MaybeImmutable } from '../../../../../common/endpoint/types';

const emptyValue = getEmptyValue();

const flexGroupStyles = css`
  max-height: 40vh;
  min-height: 270px;
  overflow-y: auto;
`;

export const ActionsLogExpandedTray = memo<{
  action: MaybeImmutable<ActionDetails>;
  'data-test-subj'?: string;
}>(({ action, 'data-test-subj': dataTestSubj }) => {
  const getTestId = useTestIdGenerator(dataTestSubj);
  const { euiTheme } = useEuiTheme();

  const customDescriptionListStyles = useMemo(
    () => css`
      &.euiDescriptionList {
        > .euiDescriptionList__title {
          color: ${euiTheme.colors.darkShade};
          font-size: ${euiTheme.font.scale.xs}rem;
        }
        > .euiDescriptionList__title,
        > .euiDescriptionList__description {
          font-weight: ${euiTheme.font.weight.regular};
        }
      }
    `,
    [euiTheme]
  );

  const descriptionListOutputStyles = useMemo(
    () => css`
      &.euiDescriptionList {
        > .euiDescriptionList__title {
          color: ${euiTheme.colors.darkShade};
          font-size: ${euiTheme.font.scale.xs}rem;
        }
        > .euiDescriptionList__title,
        > .euiDescriptionList__description {
          font-weight: ${euiTheme.font.weight.regular};
        }
      }
      dd {
        margin: ${euiTheme.size.base} 0;
        padding: ${euiTheme.size.base} 0;
        border-top: 1px dashed ${euiTheme.colors.disabled};
        border-bottom: 1px dashed ${euiTheme.colors.disabled};
      }
    `,
    [euiTheme]
  );

  const codeBlockStyles = useMemo(
    () => css`
      code {
        color: ${euiTheme.colors.darkShade} !important;
      }
    `,
    [euiTheme.colors.darkShade]
  );
  const {
    hosts,
    startedAt,
    completedAt,
    command: _command,
    comment,
    parameters,
    agentType,
  } = action;

  const parametersList = useMemo(
    () =>
      parameters
        ? Object.entries(parameters).map(([key, value]) => {
            return `${key}: ${value}`;
          })
        : undefined,
    [parameters]
  );

  const command = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[_command];

  const dataList = useMemo(() => {
    const list = [
      {
        title: OUTPUT_MESSAGES.expandSection.placedAt,
        description: `${startedAt}`,
      },
      {
        title: OUTPUT_MESSAGES.expandSection.startedAt,
        description: `${startedAt}`,
      },
      {
        title: OUTPUT_MESSAGES.expandSection.completedAt,
        description: `${completedAt ?? emptyValue}`,
      },
      {
        title: OUTPUT_MESSAGES.expandSection.input,
        description: `${command}`,
      },
      {
        title: OUTPUT_MESSAGES.expandSection.parameters,
        description: parametersList ? parametersList.join(', ') : emptyValue,
      },
      {
        title: OUTPUT_MESSAGES.expandSection.comment,
        description: comment ? comment : emptyValue,
      },
      {
        title: OUTPUT_MESSAGES.expandSection.hostname,
        description:
          reduce(
            hosts,
            (acc, host, agentId) => {
              if (host.name.trim().length) {
                acc.push(host.name);
              } else {
                acc.push(agentId);
              }
              return acc;
            },
            [] as string[]
          ).join(', ') || emptyValue,
      },
      {
        title: OUTPUT_MESSAGES.expandSection.agentType,
        description: getAgentTypeName(agentType) || emptyValue,
      },
    ];

    return list.map(({ title, description }) => {
      return {
        title: (
          <EuiCodeBlock transparentBackground paddingSize="none" css={codeBlockStyles}>
            {title}
          </EuiCodeBlock>
        ),
        description: (
          <EuiCodeBlock
            transparentBackground
            paddingSize="none"
            css={codeBlockStyles}
            data-test-subj={getTestId(`action-details-info-${title}`)}
          >
            {description}
          </EuiCodeBlock>
        ),
      };
    });
  }, [
    agentType,
    codeBlockStyles,
    command,
    comment,
    completedAt,
    getTestId,
    hosts,
    parametersList,
    startedAt,
  ]);

  const outputList = useMemo(
    () => [
      {
        title: (
          <EuiCodeBlock transparentBackground paddingSize="none" css={codeBlockStyles}>
            {`${OUTPUT_MESSAGES.expandSection.output}:`}
          </EuiCodeBlock>
        ),
        description: (
          <EuiCodeBlock
            transparentBackground
            paddingSize="none"
            css={codeBlockStyles}
            data-test-subj={getTestId('details-tray-output')}
          >
            <ActionResponseOutputs action={action} data-test-subj={getTestId('output')} />
          </EuiCodeBlock>
        ),
      },
    ],
    [action, codeBlockStyles, getTestId]
  );

  return (
    <>
      <EuiFlexGroup
        direction="column"
        className="eui-yScrollWithShadows"
        gutterSize="s"
        tabIndex={0}
        css={flexGroupStyles}
        data-test-subj={getTestId('details-tray')}
      >
        <EuiFlexItem grow={false}>
          <EuiDescriptionList
            compressed
            type="column"
            listItems={dataList}
            css={customDescriptionListStyles}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiDescriptionList compressed listItems={outputList} css={descriptionListOutputStyles} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

ActionsLogExpandedTray.displayName = 'ActionsLogExpandedTray';
