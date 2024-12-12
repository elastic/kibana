/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';

import * as i18n from './translations';

export interface LastUpdatedAtProps {
  compact?: boolean;
  updatedAt: number;
  showUpdating?: boolean;
}

export const Updated = React.memo<{ date: number; prefix: string; updatedAt: number }>(
  ({ date, prefix, updatedAt }) => (
    <>
      {prefix}
      {
        <FormattedRelative
          data-test-subj="last-updated-at-date"
          key={`formatedRelative-${date}`}
          value={new Date(updatedAt)}
        />
      }
    </>
  )
);

Updated.displayName = 'Updated';

const prefix = ` ${i18n.UPDATED} `;

export const LastUpdatedAt = React.memo<LastUpdatedAtProps>(
  ({ compact = false, updatedAt, showUpdating = false }) => {
    const [date, setDate] = useState(Date.now());

    function tick() {
      setDate(Date.now());
    }

    useEffect(() => {
      const timerID = setInterval(() => tick(), 10000);
      return () => {
        clearInterval(timerID);
      };
    }, []);

    const updateText = useMemo(() => {
      if (showUpdating) {
        return <span> {i18n.UPDATING}</span>;
      }

      if (!compact) {
        return <Updated date={date} prefix={prefix} updatedAt={updatedAt} />;
      }

      return null;
    }, [compact, date, showUpdating, updatedAt]);

    return (
      <EuiToolTip
        data-test-subj="timeline-stream-tool-tip"
        content={<Updated date={date} prefix={prefix} updatedAt={updatedAt} />}
      >
        <EuiText color="subdued" size="xs">
          {updateText}
        </EuiText>
      </EuiToolTip>
    );
  }
);

LastUpdatedAt.displayName = 'LastUpdatedAt';

// eslint-disable-next-line import/no-default-export
export { LastUpdatedAt as default };
