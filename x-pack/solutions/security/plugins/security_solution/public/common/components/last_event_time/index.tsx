/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconTip, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo, useMemo } from 'react';

import { LastEventIndexKey } from '../../../../common/search_strategy';
import { useTimelineLastEventTime } from '../../containers/events/last_event_time';
import { getEmptyTagValue } from '../empty_value';
import { FormattedRelativePreferenceDate } from '../formatted_date';

export interface LastEventTimeProps {
  entityIdentifiers?: Record<string, string>;
  indexKey: LastEventIndexKey;
  indexNames: string[];
  ip?: string;
}

/**
 * Extracts details from entityIdentifiers for the given indexKey
 */
const getDetailsFromEntityIdentifiers = (
  indexKey: LastEventIndexKey,
  entityIdentifiers?: Record<string, string>,
  ip?: string
) => {
  const details: {
    entityIdentifiers?: Record<string, string>;
    ip?: string;
  } = {
    entityIdentifiers: entityIdentifiers || {},
  };

  if (indexKey === LastEventIndexKey.hostDetails || indexKey === LastEventIndexKey.userDetails) {
    details.entityIdentifiers = entityIdentifiers || {};
  } else if (indexKey === LastEventIndexKey.ipDetails) {
    details.ip = ip;
  }

  return details;
};

export const LastEventTime = memo<LastEventTimeProps>(
  ({ entityIdentifiers, indexKey, indexNames, ip }) => {
    const details = useMemo(
      () => getDetailsFromEntityIdentifiers(indexKey, entityIdentifiers, ip),
      [entityIdentifiers, indexKey, ip]
    );

    const [loading, { lastSeen, errorMessage }] = useTimelineLastEventTime({
      indexKey,
      indexNames,
      details,
    });

    if (errorMessage != null) {
      return (
        <EuiIconTip
          position="top"
          content={errorMessage}
          aria-label="last_event_time_error"
          id={`last_event_time_error-${indexKey}`}
          type="warning"
          iconProps={{
            'data-test-subj': 'last_event_time_error',
          }}
        />
      );
    }

    return (
      <>
        {loading && <EuiLoadingSpinner size="m" />}
        {!loading && lastSeen != null && new Date(lastSeen).toString() === 'Invalid Date'
          ? lastSeen
          : !loading &&
            lastSeen != null && (
              <FormattedMessage
                id="xpack.securitySolution.headerPage.pageSubtitle"
                defaultMessage="Last event: {beat}"
                values={{
                  beat: <FormattedRelativePreferenceDate value={lastSeen} />,
                }}
              />
            )}
        {!loading && lastSeen == null && getEmptyTagValue()}
      </>
    );
  }
);

LastEventTime.displayName = 'LastEventTime';
