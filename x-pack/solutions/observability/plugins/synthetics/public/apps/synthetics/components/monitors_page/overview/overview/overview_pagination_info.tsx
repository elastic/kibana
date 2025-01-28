/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText, EuiLoadingSpinner, EuiI18nNumber, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';
import { selectOverviewStatus } from '../../../../state/overview_status';

export const OverviewPaginationInfo = ({
  total,
  startRange,
  endRange,
}: {
  total?: number;
  startRange?: number;
  endRange?: number;
}) => {
  const { loaded } = useSelector(selectOverviewStatus);

  return loaded && total !== undefined ? (
    <EuiText size="xs">
      {startRange && endRange ? (
        <FormattedMessage
          id="xpack.synthetics.overview.pagination.description"
          defaultMessage="Showing {currentCount} of {total} {monitors}"
          values={{
            currentCount: <strong>{`${startRange}-${endRange}`}</strong>,
            total,
            monitors: (
              <strong>
                <FormattedMessage
                  id="xpack.synthetics.overview.monitors.label"
                  defaultMessage="Monitors"
                />
              </strong>
            ),
          }}
        />
      ) : (
        <FormattedMessage
          id="xpack.synthetics.management.monitorList.recordTotal"
          defaultMessage="Showing {total} {monitorsLabel}"
          values={{
            total: (
              <strong>
                <EuiI18nNumber value={total} />
              </strong>
            ),
            monitorsLabel: (
              <strong>
                <FormattedMessage
                  id="xpack.synthetics.management.monitorList.recordRangeLabel"
                  defaultMessage="{monitorCount, plural, one {Monitor} other {Monitors}}"
                  values={{
                    monitorCount: total,
                  }}
                />
              </strong>
            ),
          }}
        />
      )}
    </EuiText>
  ) : (
    <EuiText size="xs" data-test-subj="syntheticsOverviewMonitorsLoading">
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.synthetics.overview.pagination.loading"
            defaultMessage="Loading Monitors..."
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};
