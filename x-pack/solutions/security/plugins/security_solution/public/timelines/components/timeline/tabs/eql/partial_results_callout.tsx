/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiAccordion, EuiCallOut, EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
import type { EqlShardFailure } from '../../../../containers';
import * as i18n from './translations';

interface PartialResultsCalloutProps {
  shardFailures: EqlShardFailure[];
  timedOut: boolean;
}

const formatFailureReason = (failure: EqlShardFailure): string => {
  const type = failure.reason?.type;
  const reason = failure.reason?.reason;
  if (type != null && reason != null) {
    return `${type}: ${reason}`;
  }
  if (type != null) {
    return type;
  }
  if (reason != null) {
    return reason;
  }
  return '';
};

const PartialResultsCalloutComponent: React.FC<PartialResultsCalloutProps> = ({
  shardFailures,
  timedOut,
}) => {
  const hasDetails = shardFailures.length > 0 || timedOut;

  return (
    <EuiCallOut
      color="warning"
      iconType="warning"
      title={i18n.PARTIAL_RESULTS_WARNING_TITLE}
      data-test-subj="eql-partial-results-warning"
    >
      <p>{i18n.PARTIAL_RESULTS_WARNING_BODY}</p>
      {hasDetails ? (
        <EuiAccordion
          id="eql-partial-results-warning-details"
          buttonContent={i18n.PARTIAL_RESULTS_WARNING_DETAILS}
          data-test-subj="eql-partial-results-warning-details"
        >
          {timedOut ? (
            <>
              <EuiText size="s">{i18n.PARTIAL_RESULTS_WARNING_TIMED_OUT}</EuiText>
              <EuiSpacer size="s" />
            </>
          ) : null}
          {shardFailures.map((failure, index) => {
            const reason = formatFailureReason(failure);
            return (
              <React.Fragment
                key={`${failure.index ?? 'unknown'}-${failure.shard ?? 'unknown'}-${index}`}
              >
                <EuiText size="s">
                  <strong>
                    {i18n.PARTIAL_RESULTS_WARNING_INDEX}
                    {': '}
                  </strong>
                  {failure.index ?? '\u2014'}
                  {' \u00b7 '}
                  <strong>
                    {i18n.PARTIAL_RESULTS_WARNING_SHARD}
                    {': '}
                  </strong>
                  {failure.shard ?? '\u2014'}
                </EuiText>
                {reason !== '' ? (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiText size="s">
                      <strong>
                        {i18n.PARTIAL_RESULTS_WARNING_REASON}
                        {':'}
                      </strong>
                    </EuiText>
                    <EuiCodeBlock language="text" fontSize="s" paddingSize="s">
                      {reason}
                    </EuiCodeBlock>
                  </>
                ) : null}
                <EuiSpacer size="s" />
              </React.Fragment>
            );
          })}
        </EuiAccordion>
      ) : null}
    </EuiCallOut>
  );
};

export const PartialResultsCallout = memo(PartialResultsCalloutComponent);
