/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCallOutProps,
  EuiFlexGroup,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import useToggle from 'react-use/lib/useToggle';
import { css } from '@emotion/react';
import { ProcessorMetrics } from '../hooks/use_processing_simulator';

type ProcessorMetricBadgesProps = ProcessorMetrics;

const formatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

export const ProcessorMetricBadges = ({
  detected_fields,
  failure_rate,
  success_rate,
}: ProcessorMetricBadgesProps) => {
  const detectedFieldsCount = detected_fields.length;
  const failureRate = failure_rate > 0 ? formatter.format(failure_rate) : null;
  const successRate = success_rate > 0 ? formatter.format(success_rate) : null;

  return (
    <EuiBadgeGroup gutterSize="xs">
      {failureRate && (
        <EuiBadge
          color="hollow"
          iconType="warning"
          title={i18n.translate('xpack.streams.processorMetricBadges.euiBadge.failureRate', {
            defaultMessage:
              '{failureRate} of the sampled documents were not parsed due to an error',
            values: { failureRate },
          })}
        >
          {failureRate}
        </EuiBadge>
      )}
      {successRate && (
        <EuiBadge
          color="hollow"
          iconType="check"
          title={i18n.translate('xpack.streams.processorMetricBadges.euiBadge.successRate', {
            defaultMessage:
              '{successRate} of the sampled documents were successfully parsed by this processor',
            values: { successRate },
          })}
        >
          {successRate}
        </EuiBadge>
      )}
      {detectedFieldsCount > 0 && (
        <EuiBadge
          color="hollow"
          title={i18n.translate('xpack.streams.processorMetricBadges.euiBadge.detectedFields', {
            defaultMessage:
              '{detectedFieldsCount, plural, one {# field was parsed on the sampled documents: } other {# fields were parsed on the sampled documents:\n}}{detectedFields}',
            values: { detectedFieldsCount, detectedFields: detected_fields.join('\n') },
          })}
        >
          {i18n.translate('xpack.streams.processorMetricBadges.fieldsBadgeLabel', {
            defaultMessage: '{detectedFieldsCount, plural, one {# field } other {# fields}}',
            values: { detectedFieldsCount },
          })}
        </EuiBadge>
      )}
    </EuiBadgeGroup>
  );
};

const errorTitle = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.processorErrors.title',
  { defaultMessage: "Processor configuration invalid or doesn't match." }
);

export const ProcessorErrors = ({ metrics }: { metrics: ProcessorMetrics }) => {
  const { errors, success_rate } = metrics;

  const { euiTheme } = useEuiTheme();
  const [isErrorListExpanded, toggleErrorListExpanded] = useToggle(false);

  const visibleErrors = isErrorListExpanded ? errors : errors.slice(0, 2);
  const remainingCount = errors.length - 2;
  const shouldDisplayErrorToggle = remainingCount > 0;

  const getCalloutProps = (type: ProcessorMetrics['errors'][number]['type']): EuiCallOutProps => {
    const isWarningError = type === 'generic_processor_failure' && success_rate > 0;

    return {
      color: isWarningError ? 'warning' : 'danger',
    };
  };

  return (
    <>
      <EuiFlexGroup
        gutterSize="xs"
        direction="column"
        css={css`
          margin-top: ${euiTheme.size.m};
        `}
      >
        {visibleErrors.map((error, id) => (
          <EuiCallOut
            key={id}
            {...getCalloutProps(error.type)}
            iconType="warning"
            size="s"
            title={errorTitle}
          >
            {error.message}
          </EuiCallOut>
        ))}
      </EuiFlexGroup>
      {shouldDisplayErrorToggle && !isErrorListExpanded && (
        <EuiButtonEmpty
          data-test-subj="streamsAppProcessorErrorsShowMoreButton"
          onClick={toggleErrorListExpanded}
          size="xs"
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorErrors.showMore',
            {
              defaultMessage: 'Show {remainingCount} similar errors...',
              values: { remainingCount },
            }
          )}
        </EuiButtonEmpty>
      )}
      {shouldDisplayErrorToggle && isErrorListExpanded && (
        <EuiButtonEmpty
          data-test-subj="streamsAppProcessorErrorsShowLessButton"
          onClick={toggleErrorListExpanded}
          size="xs"
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorErrors.showLess',
            { defaultMessage: 'Show less errors' }
          )}
        </EuiButtonEmpty>
      )}
    </>
  );
};
