/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { Fragment, useMemo } from 'react';
import { css } from '@emotion/css';
import { EuiCallOut, EuiText, EuiSpacer, EuiAccordion } from '@elastic/eui';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';

import type { RulePreviewLogs } from '../../../../../common/api/detection_engine';
import * as i18n from './translations';
import { LoggedRequests } from './logged_requests';
import { useAccordionStyling } from './use_accordion_styling';

interface PreviewLogsProps {
  logs: RulePreviewLogs[];
  hasNoiseWarning: boolean;
  isAborted: boolean;
  showElasticsearchRequests: boolean;
  ruleType: Type;
}

interface SortedLogs {
  duration: number;
  startedAt?: string;
  logs: string[];
}

interface LogAccordionProps {
  logs: SortedLogs[];
  isError?: boolean;
}

const CustomWarning: React.FC<{ message: string }> = ({ message }) => (
  <EuiCallOut color={'warning'} iconType="warning" data-test-subj={'preview-abort'}>
    <EuiText>
      <p>{message}</p>
    </EuiText>
  </EuiCallOut>
);

const addLogs = (
  startedAt: string | undefined,
  logs: string[],
  duration: number,
  allLogs: SortedLogs[]
) => (logs.length ? [{ startedAt, logs, duration }, ...allLogs] : allLogs);

const PreviewLogsComponent: React.FC<PreviewLogsProps> = ({
  logs,
  hasNoiseWarning,
  isAborted,
  showElasticsearchRequests,
  ruleType,
}) => {
  const sortedLogs = useMemo(
    () =>
      logs.reduce<{
        errors: SortedLogs[];
        warnings: SortedLogs[];
      }>(
        ({ errors, warnings }, curr) => ({
          errors: addLogs(curr.startedAt, curr.errors, curr.duration, errors),
          warnings: addLogs(curr.startedAt, curr.warnings, curr.duration, warnings),
        }),
        { errors: [], warnings: [] }
      ),
    [logs]
  );
  return (
    <>
      <EuiSpacer size="s" />
      {hasNoiseWarning ?? <CustomWarning message={i18n.QUERY_PREVIEW_NOISE_WARNING} />}
      <LogAccordion logs={sortedLogs.errors} isError />
      <LogAccordion logs={sortedLogs.warnings}>
        {isAborted ? <CustomWarning message={i18n.PREVIEW_TIMEOUT_WARNING} /> : null}
      </LogAccordion>
      {showElasticsearchRequests ? <LoggedRequests logs={logs} ruleType={ruleType} /> : null}
    </>
  );
};

export const PreviewLogs = React.memo(PreviewLogsComponent);
PreviewLogs.displayName = 'PreviewLogs';

const LogAccordion: FC<PropsWithChildren<LogAccordionProps>> = ({ logs, isError, children }) => {
  const cssStyles = useAccordionStyling();

  const firstLog = logs[0];
  if (!(children || firstLog)) return null;

  const restOfLogs = children ? logs : logs.slice(1);
  const bannerElement = children ?? (
    <CalloutGroup
      logs={firstLog.logs}
      startedAt={firstLog.startedAt}
      isError={isError}
      duration={firstLog.duration}
    />
  );

  return (
    <>
      {bannerElement}
      {restOfLogs.length > 0 ? (
        <EuiAccordion
          id={isError ? 'previewErrorAccordion' : 'previewWarningAccordion'}
          buttonContent={
            isError ? i18n.QUERY_PREVIEW_SEE_ALL_ERRORS : i18n.QUERY_PREVIEW_SEE_ALL_WARNINGS
          }
          borders="horizontal"
          css={css`
            ${cssStyles}
          `}
        >
          {restOfLogs.map((log, key) => (
            <CalloutGroup
              key={`accordion-log-${key}`}
              logs={log.logs}
              startedAt={log.startedAt}
              duration={log.duration}
              isError={isError}
            />
          ))}
        </EuiAccordion>
      ) : null}
    </>
  );
};

export const CalloutGroup: React.FC<{
  logs: string[];
  duration: number;
  startedAt?: string;
  isError?: boolean;
}> = ({ logs, startedAt, isError, duration }) => {
  return logs.length > 0 ? (
    <>
      {logs.map((log, i) => (
        <Fragment key={i}>
          <EuiCallOut
            color={isError ? 'danger' : 'warning'}
            iconType="warning"
            data-test-subj={isError ? 'preview-error' : 'preview-warning'}
            title={`${startedAt ? `[${startedAt}] ` : ''}[${duration}ms]`}
          >
            <EuiText>
              <p>{log}</p>
            </EuiText>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </Fragment>
      ))}
    </>
  ) : null;
};
