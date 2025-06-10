/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import moment from 'moment';

import { ErrorsPopover } from './errors_popover';
import * as i18n from '../../../translations';
import type { ErrorSummary, IndexToCheck } from '../../../types';
import { useDataQualityContext } from '../../../data_quality_context';

export const EMPTY_LAST_CHECKED_DATE = '--';

interface Props {
  checkAllIndiciesChecked: number;
  checkAllTotalIndiciesToCheck: number;
  errorSummary: ErrorSummary[];
  indexToCheck: IndexToCheck | null;
}

const CheckStatusComponent: React.FC<Props> = ({
  checkAllIndiciesChecked,
  checkAllTotalIndiciesToCheck,
  errorSummary,
  indexToCheck,
}) => {
  const { addSuccessToast, lastChecked, setLastChecked } = useDataQualityContext();
  const [formattedDate, setFormattedDate] = useState<string>(EMPTY_LAST_CHECKED_DATE);

  useEffect(() => {
    // update the lastCheckedDate whenever the next to check is updated
    if (indexToCheck != null) {
      setLastChecked(new Date().toISOString());
    }
  }, [indexToCheck, setLastChecked]);

  useEffect(() => {
    // immediately update the formatted date when lastCheckedDate is updated
    if (moment(lastChecked).isValid()) {
      setFormattedDate(moment(lastChecked).fromNow());
    }

    // periodically update the formatted date as time passes
    const intervalId = setInterval(() => {
      if (moment(lastChecked).isValid()) {
        setFormattedDate(moment(lastChecked).fromNow());
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [lastChecked]);

  return (
    <EuiFlexGroup data-test-subj="checkStatus" direction="column" gutterSize="none">
      {indexToCheck != null && (
        <>
          <EuiFlexItem grow={true}>
            <EuiText size="s">
              <span data-test-subj="checking">{i18n.CHECKING(indexToCheck.indexName)}</span>
            </EuiText>
          </EuiFlexItem>

          <EuiSpacer size="xs" />

          <EuiFlexItem grow={true}>
            <EuiProgress
              data-test-subj="progress"
              max={checkAllTotalIndiciesToCheck}
              size="xs"
              value={checkAllIndiciesChecked}
            />
          </EuiFlexItem>
        </>
      )}

      <EuiFlexItem grow={true}>
        {indexToCheck == null && (
          <EuiText color="subdued" data-test-subj="lastChecked" size="s">
            {i18n.LAST_CHECKED}
            {': '}
            {formattedDate}
          </EuiText>
        )}

        {errorSummary.length > 0 && (
          <div>
            <ErrorsPopover addSuccessToast={addSuccessToast} errorSummary={errorSummary} />
          </div>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CheckStatusComponent.displayName = 'CheckStatusComponent';

export const CheckStatus = React.memo(CheckStatusComponent);
