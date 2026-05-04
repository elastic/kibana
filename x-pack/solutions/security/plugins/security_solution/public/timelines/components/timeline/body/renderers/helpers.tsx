/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { isEmpty, isNumber } from 'lodash/fp';
import type { ComponentProps, FC } from 'react';
import React from 'react';

import type { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';

export const deleteItemIdx = (data: TimelineNonEcsData[], idx: number) => [
  ...data.slice(0, idx),
  ...data.slice(idx + 1),
];

export const findItem = (data: TimelineNonEcsData[], field: string): number =>
  data.findIndex((d) => d.field === field);

export const getValues = (field: string, data: TimelineNonEcsData[]): string[] | undefined => {
  const obj = data.find((d) => d.field === field);
  if (obj != null && obj.value != null) {
    return obj.value;
  }
  return undefined;
};

export const DETAILS_CLASS_NAME = 'details';

export const Details: FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div
    className={className ? `${DETAILS_CLASS_NAME} ${className}` : DETAILS_CLASS_NAME}
    css={css`
      margin: 5px 0 5px 10px;
      & .euiBadge {
        margin: 2px 0 2px 0;
      }
      & .euiFlexGroup {
        justify-content: center;
      }
    `}
    {...rest}
  />
);

export const TokensFlexItem: FC<ComponentProps<typeof EuiFlexItem>> = (props) => (
  <EuiFlexItem
    css={css`
      margin-left: 3px;
    `}
    {...props}
  />
);

export function isNillEmptyOrNotFinite<T>(value: string | number | T[] | null | undefined) {
  return isNumber(value) ? !isFinite(value) : isEmpty(value);
}

export const isFileEvent = ({
  eventCategory,
  eventDataset,
}: {
  eventCategory: string | null | undefined;
  eventDataset: string | null | undefined;
}) =>
  eventCategory?.toLowerCase() === 'file' ||
  eventDataset?.toLowerCase() === 'file' ||
  eventDataset?.toLowerCase() === 'endpoint.events.file';

export const isProcessStoppedOrTerminationEvent = (
  eventAction: string | null | undefined
): boolean => ['process_stopped', 'termination_event'].includes(`${eventAction}`.toLowerCase());

export const showVia = (eventAction: string | null | undefined): boolean =>
  [
    'created',
    'creation',
    'deleted',
    'deletion',
    'file_create_event',
    'file_delete_event',
    'files-encrypted',
    'load',
    'modification',
    'overwrite',
    'rename',
  ].includes(`${eventAction}`.toLowerCase());
