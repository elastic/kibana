/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dateMath from '@kbn/datemath';
import type { OnTimeChangeProps } from '@elastic/eui';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiSuperUpdateButton,
  EuiText,
  EuiTitle,
  EuiFormRow,
  EuiCheckbox,
} from '@elastic/eui';
import moment from 'moment';
import type { List } from '@kbn/securitysolution-io-ts-list-types';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';

import { isEqual } from 'lodash';
import * as i18n from './translations';
import { usePreviewRoute } from './use_preview_route';
import { PreviewHistogram } from './preview_histogram';
import { PreviewLogs } from './preview_logs';
import { useKibana } from '../../../../common/lib/kibana';
import { LoadingHistogram } from './loading_histogram';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { SINGLE_RULE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import type {
  AboutStepRule,
  DefineStepRule,
  ScheduleStepRule,
  TimeframePreviewOptions,
} from '../../../../detections/pages/detection_engine/rules/types';
import { usePreviewInvocationCount } from './use_preview_invocation_count';

export const REASONABLE_INVOCATION_COUNT = 200;

const RULE_TYPES_SUPPORTING_LOGGED_REQUESTS: Type[] = [
  'esql',
  'eql',
  'threshold',
  'machine_learning',
  'query',
  'saved_query',
  'new_terms',
];

const timeRanges = [
  { start: 'now/d', end: 'now', label: 'Today' },
  { start: 'now/w', end: 'now', label: 'This week' },
  { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
  { start: 'now-30m', end: 'now', label: 'Last 30 minutes' },
  { start: 'now-1h', end: 'now', label: 'Last 1 hour' },
  { start: 'now-24h', end: 'now', label: 'Last 24 hours' },
  { start: 'now-7d', end: 'now', label: 'Last 7 days' },
  { start: 'now-30d', end: 'now', label: 'Last 30 days' },
];

export interface RulePreviewProps {
  isDisabled?: boolean;
  defineRuleData: DefineStepRule;
  aboutRuleData: AboutStepRule;
  scheduleRuleData: ScheduleStepRule;
  exceptionsList?: List[];
}

interface RulePreviewState {
  defineRuleData?: DefineStepRule;
  aboutRuleData?: AboutStepRule;
  scheduleRuleData?: ScheduleStepRule;
  timeframeOptions: TimeframePreviewOptions;
  enableLoggedRequests?: boolean;
}

const refreshedTimeframe = (startDate: string, endDate: string) => {
  return {
    start: dateMath.parse(startDate) || moment().subtract(1, 'hour'),
    end: dateMath.parse(endDate) || moment(),
  };
};

const RulePreviewComponent: React.FC<RulePreviewProps> = ({
  isDisabled,
  defineRuleData,
  aboutRuleData,
  scheduleRuleData,
  exceptionsList,
}) => {
  const { indexPattern, ruleType } = defineRuleData;
  const { spaces } = useKibana().services;

  const [spaceId, setSpaceId] = useState('');
  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  // Raw timeframe as a string
  const [startDate, setStartDate] = useState('now-1h');
  const [endDate, setEndDate] = useState('now');

  // Parsed timeframe as a Moment object
  const [timeframeStart, setTimeframeStart] = useState(moment().subtract(1, 'hour'));
  const [timeframeEnd, setTimeframeEnd] = useState(moment());

  const [showElasticsearchRequests, setShowElasticsearchRequests] = useState(false);

  const [isDateRangeInvalid, setIsDateRangeInvalid] = useState(false);

  const isLoggedRequestsSupported = RULE_TYPES_SUPPORTING_LOGGED_REQUESTS.includes(ruleType);

  useEffect(() => {
    const { start, end } = refreshedTimeframe(startDate, endDate);
    setTimeframeStart(start);
    setTimeframeEnd(end);
  }, [startDate, endDate]);

  // The data state that we used for the last preview results
  const [previewData, setPreviewData] = useState<RulePreviewState>({
    timeframeOptions: {
      timeframeStart,
      timeframeEnd,
      interval: '5m',
      lookback: '1m',
    },
  });

  const { invocationCount } = usePreviewInvocationCount({
    timeframeOptions: {
      timeframeStart,
      timeframeEnd,
      interval: scheduleRuleData.interval,
      lookback: scheduleRuleData.from,
    },
  });
  const showInvocationCountWarning = invocationCount > REASONABLE_INVOCATION_COUNT;

  const {
    addNoiseWarning,
    createPreview,
    isPreviewRequestInProgress,
    previewId,
    logs,
    hasNoiseWarning,
    isAborted,
  } = usePreviewRoute({
    defineRuleData: previewData.defineRuleData,
    aboutRuleData: previewData.aboutRuleData,
    scheduleRuleData: previewData.scheduleRuleData,
    exceptionsList,
    timeframeOptions: previewData.timeframeOptions,
    enableLoggedRequests: previewData.enableLoggedRequests,
  });

  const { startTransaction } = useStartTransaction();

  const [isRefreshing, setIsRefreshing] = useState(false);
  useEffect(() => {
    if (!isRefreshing) {
      return;
    }
    createPreview();
    setIsRefreshing(false);
  }, [isRefreshing, createPreview]);

  useEffect(() => {
    const { start, end } = refreshedTimeframe(startDate, endDate);
    setTimeframeStart(start);
    setTimeframeEnd(end);
  }, [endDate, startDate]);

  const onTimeChange = useCallback(
    ({ start: newStart, end: newEnd, isInvalid }: OnTimeChangeProps) => {
      setIsDateRangeInvalid(isInvalid);
      if (!isInvalid) {
        setStartDate(newStart);
        setEndDate(newEnd);
      }
    },
    []
  );

  const onTimeframeRefresh = useCallback(() => {
    startTransaction({ name: SINGLE_RULE_ACTIONS.PREVIEW });
    const { start, end } = refreshedTimeframe(startDate, endDate);
    setTimeframeStart(start);
    setTimeframeEnd(end);
    setPreviewData({
      defineRuleData,
      aboutRuleData,
      scheduleRuleData,
      timeframeOptions: {
        timeframeStart: start,
        timeframeEnd: end,
        interval: scheduleRuleData.interval,
        lookback: scheduleRuleData.from,
      },
      enableLoggedRequests: showElasticsearchRequests && isLoggedRequestsSupported,
    });
    setIsRefreshing(true);
  }, [
    aboutRuleData,
    defineRuleData,
    endDate,
    scheduleRuleData,
    startDate,
    startTransaction,
    showElasticsearchRequests,
    isLoggedRequestsSupported,
  ]);

  const isDirty = useMemo(
    () =>
      !timeframeStart.isSame(previewData.timeframeOptions.timeframeStart) ||
      !timeframeEnd.isSame(previewData.timeframeOptions.timeframeEnd) ||
      !isEqual(defineRuleData, previewData.defineRuleData) ||
      !isEqual(aboutRuleData, previewData.aboutRuleData) ||
      !isEqual(scheduleRuleData, previewData.scheduleRuleData),
    [
      aboutRuleData,
      defineRuleData,
      previewData.aboutRuleData,
      previewData.defineRuleData,
      previewData.scheduleRuleData,
      previewData.timeframeOptions.timeframeEnd,
      previewData.timeframeOptions.timeframeStart,
      scheduleRuleData,
      timeframeEnd,
      timeframeStart,
    ]
  );

  return (
    <div data-test-subj="rule-preview">
      <EuiTitle size="m">
        <h2>{i18n.RULE_PREVIEW_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued">
        <p>{i18n.RULE_PREVIEW_DESCRIPTION}</p>
      </EuiText>
      <EuiSpacer size="s" />
      {showInvocationCountWarning && (
        <>
          <EuiCallOut
            color="warning"
            title={i18n.QUERY_PREVIEW_INVOCATION_COUNT_WARNING_TITLE}
            data-test-subj="previewInvocationCountWarning"
          >
            {i18n.QUERY_PREVIEW_INVOCATION_COUNT_WARNING_MESSAGE}
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <EuiSpacer size="xs" />
      <EuiFormRow label={i18n.QUERY_PREVIEW_LABEL}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive>
          <EuiFlexItem grow>
            <EuiSuperDatePicker
              start={startDate}
              end={endDate}
              isDisabled={isDisabled}
              onTimeChange={onTimeChange}
              showUpdateButton={false}
              commonlyUsedRanges={timeRanges}
              onRefresh={onTimeframeRefresh}
              data-test-subj="preview-time-frame"
              width="full"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSuperUpdateButton
              isDisabled={isDateRangeInvalid || isDisabled}
              iconType={isDirty ? 'kqlFunction' : 'refresh'}
              onClick={onTimeframeRefresh}
              color={isDirty ? 'success' : 'primary'}
              fill={true}
              data-test-subj="previewSubmitButton"
              fullWidth={true}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      {isLoggedRequestsSupported ? (
        <EuiFormRow>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive>
            <EuiFlexItem grow>
              <EuiCheckbox
                data-test-subj="show-elasticsearch-requests"
                id="showElasticsearchRequests"
                label={i18n.ENABLED_LOGGED_REQUESTS_CHECKBOX}
                checked={showElasticsearchRequests}
                onChange={() => {
                  setShowElasticsearchRequests(!showElasticsearchRequests);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      ) : null}
      <EuiSpacer size="l" />
      {isPreviewRequestInProgress && <LoadingHistogram />}
      {!isPreviewRequestInProgress && previewId && spaceId && (
        <PreviewHistogram
          ruleType={ruleType}
          previewId={previewId}
          addNoiseWarning={addNoiseWarning}
          spaceId={spaceId}
          indexPattern={indexPattern}
          timeframeOptions={previewData.timeframeOptions}
        />
      )}
      <PreviewLogs
        logs={logs}
        hasNoiseWarning={hasNoiseWarning}
        isAborted={isAborted}
        showElasticsearchRequests={showElasticsearchRequests && isLoggedRequestsSupported}
        ruleType={ruleType}
      />
    </div>
  );
};

export const RulePreview = React.memo(RulePreviewComponent);
