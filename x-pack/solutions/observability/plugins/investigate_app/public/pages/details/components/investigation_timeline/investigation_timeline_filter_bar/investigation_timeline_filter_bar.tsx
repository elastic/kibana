/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDatePicker, EuiDatePickerRange, EuiFlexGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import moment from 'moment';
import React from 'react';
import { useInvestigation } from '../../../contexts/investigation_context';
import { InvestigationEventTypesFilter } from './investigation_event_types_filter';

interface Props {
  onEventTypesSelected: (eventTypes: string[]) => void;
}

export function InvestigationTimelineFilterBar({ onEventTypesSelected }: Props) {
  const { globalParams, updateInvestigationParams } = useInvestigation();

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      alignItems="flexStart"
      justifyContent="spaceBetween"
      css={css`
        padding: 8px 8px 0px 8px;
        max-height: fit-content;
      `}
    >
      <InvestigationEventTypesFilter onSelected={onEventTypesSelected} />

      <EuiDatePickerRange
        compressed
        startDateControl={
          <EuiDatePicker
            selected={moment(globalParams.timeRange.from)}
            onChange={(date) => {
              if (!date) return;

              updateInvestigationParams({
                timeRange: {
                  from: date.toISOString(),
                  to: globalParams.timeRange.to,
                },
              });
            }}
            showTimeSelect
          />
        }
        endDateControl={
          <EuiDatePicker
            selected={moment(globalParams.timeRange.to)}
            onChange={(date) => {
              if (!date) return;

              updateInvestigationParams({
                timeRange: {
                  from: globalParams.timeRange.from,
                  to: date.toISOString(),
                },
              });
            }}
            showTimeSelect
          />
        }
      />
    </EuiFlexGroup>
  );
}
