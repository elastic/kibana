/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiIcon, EuiLink, useEuiTheme } from '@elastic/eui';
import type { ReactElement } from 'react';
import React, { useMemo, type FC, type PropsWithChildren } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useRuleDetailsLink } from '../../shared/hooks/use_rule_details_link';
import { SESSION_PREVIEW_RULE_DETAILS_LINK_TEST_ID, SESSION_PREVIEW_TEST_ID } from './test_ids';
import { useDocumentDetailsContext } from '../../shared/context';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { useProcessData } from '../hooks/use_process_data';

/**
 * One-off helper to make sure that inline values are rendered consistently
 */
const ValueContainer: FC<PropsWithChildren<{ text?: ReactElement }>> = ({ text, children }) => (
  <>
    {text && (
      <>
        &nbsp;
        <span>{text}</span>
        &nbsp;
      </>
    )}
    {children}
  </>
);

/**
 * Renders session preview under Visualizations section in the flyout right EuiPanel
 */
export const SessionPreview: FC = () => {
  const { isPreview } = useDocumentDetailsContext();

  const { processName, userName, startAt, ruleName, ruleId, workdir, command } = useProcessData();
  const { euiTheme } = useEuiTheme();

  const emphasisStyles = useMemo(
    () => ({ fontWeight: euiTheme.font.weight.bold }),
    [euiTheme.font.weight.bold]
  );

  const processNameFragment = useMemo(() => {
    return (
      processName && (
        <ValueContainer
          text={
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.visualizations.sessionPreview.processDescription"
              defaultMessage="started"
            />
          }
        >
          <span style={emphasisStyles}>{processName}</span>
        </ValueContainer>
      )
    );
  }, [emphasisStyles, processName]);

  const timeFragment = useMemo(() => {
    return (
      startAt && (
        <ValueContainer
          text={
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.visualizations.sessionPreview.timeDescription"
              defaultMessage="at"
            />
          }
        >
          <span>
            <PreferenceFormattedDate value={new Date(startAt)} />
          </span>
        </ValueContainer>
      )
    );
  }, [startAt]);

  const href = useRuleDetailsLink({ ruleId: !isPreview ? ruleId : null });

  const ruleFragment = useMemo(() => {
    return (
      ruleName &&
      ruleId && (
        <ValueContainer
          text={
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.visualizations.sessionPreview.ruleDescription"
              defaultMessage="with rule"
            />
          }
        >
          {href ? (
            <EuiLink
              href={href}
              target="_blank"
              data-test-subj={SESSION_PREVIEW_RULE_DETAILS_LINK_TEST_ID}
            >
              {ruleName}
            </EuiLink>
          ) : (
            <ValueContainer>{ruleName}</ValueContainer>
          )}
        </ValueContainer>
      )
    );
  }, [ruleName, ruleId, href]);

  const commandFragment = useMemo(() => {
    return (
      command && (
        <ValueContainer
          text={
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.visualizations.sessionPreview.commandDescription"
              defaultMessage="by"
            />
          }
        >
          <EuiCode>
            {workdir} {command}
          </EuiCode>
        </ValueContainer>
      )
    );
  }, [command, workdir]);

  return (
    <div
      css={css`
        line-height: 1.5;
      `}
      data-test-subj={SESSION_PREVIEW_TEST_ID}
    >
      <ValueContainer>
        <EuiIcon type="user" />
        &nbsp;
        <span style={emphasisStyles}>{userName}</span>
      </ValueContainer>
      {processNameFragment}
      {timeFragment}
      {ruleFragment}
      {commandFragment}
    </div>
  );
};
