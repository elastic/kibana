/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiIcon, EuiLink, useEuiTheme } from '@elastic/eui';
import React, { type FC, type PropsWithChildren, type ReactElement, useMemo } from 'react';
import { css } from '@emotion/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { useRuleDetailsLink } from '../../../flyout/document_details/shared/hooks/use_rule_details_link';
import { SESSION_PREVIEW_RULE_DETAILS_LINK_TEST_ID, SESSION_PREVIEW_TEST_ID } from './test_ids';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
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
interface SessionPreviewProps {
  /**
   * Whether the navigation to session view should be disabled. This is true when in rule preview mode or when session view is not enabled, as in both cases we don't want to show the link to session view in the header.
   */
  disableNavigation: boolean;
  /**
   * DataTableRecord of the document for which session preview will be rendered
   */
  hit: DataTableRecord;
}

/**
 * Renders session preview under Visualizations section in the flyout right EuiPanel. It shows who started the process, what process was started, when it was started, by which command and if available with which rule. If rule information is available and navigation is not disabled, the rule name will be a link to the rule details page.
 */
export const SessionPreview = ({ disableNavigation, hit }: SessionPreviewProps) => {
  const { euiTheme } = useEuiTheme();
  const emphasisStyles = useMemo(
    () => ({ fontWeight: euiTheme.font.weight.bold }),
    [euiTheme.font.weight.bold]
  );

  const { processName, userName, startAt, ruleName, ruleId, workdir, command } =
    useProcessData(hit);

  const processNameFragment = useMemo(() => {
    return (
      processName && (
        <ValueContainer
          text={
            <FormattedMessage
              id="xpack.securitySolution.flyout.document.visualizations.sessionPreview.processDescription"
              defaultMessage="started"
            />
          }
        >
          <span css={emphasisStyles}>{processName}</span>
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
              id="xpack.securitySolution.flyout.document.visualizations.sessionPreview.timeDescription"
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

  const href = useRuleDetailsLink({ ruleId: !disableNavigation ? ruleId : null });

  const ruleFragment = useMemo(() => {
    return (
      ruleName &&
      ruleId && (
        <ValueContainer
          text={
            <FormattedMessage
              id="xpack.securitySolution.flyout.document.visualizations.sessionPreview.ruleDescription"
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
              id="xpack.securitySolution.flyout.document.visualizations.sessionPreview.commandDescription"
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
        <EuiIcon type="user" aria-hidden={true} />
        &nbsp;
        <span css={emphasisStyles}>{userName}</span>
      </ValueContainer>
      {processNameFragment}
      {timeFragment}
      {ruleFragment}
      {commandFragment}
    </div>
  );
};
