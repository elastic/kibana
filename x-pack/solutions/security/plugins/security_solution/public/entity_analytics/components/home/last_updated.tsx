/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

const UPDATED_PREFIX = ` ${i18n.translate(
  'xpack.securitySolution.entityAnalytics.lastUpdated.prefix',
  { defaultMessage: 'Updated' }
)} `;

const UpdatedText = React.memo<{ date: number; updatedAt: number }>(({ date, updatedAt }) => (
  <>
    {UPDATED_PREFIX}
    <FormattedRelative
      data-test-subj="entity-analytics-last-updated-date"
      key={`formattedRelative-${date}`}
      value={new Date(updatedAt)}
    />
  </>
));

UpdatedText.displayName = 'UpdatedText';

export interface LastUpdatedProps {
  updatedAt: number;
}

export const LastUpdated = React.memo<LastUpdatedProps>(({ updatedAt }) => {
  const [date, setDate] = useState(Date.now());

  useEffect(() => {
    const timerID = setInterval(() => setDate(Date.now()), 10000);
    return () => clearInterval(timerID);
  }, []);

  const displayText = useMemo(
    () => <UpdatedText date={date} updatedAt={updatedAt} />,
    [date, updatedAt]
  );

  return (
    <EuiText
      color="subdued"
      size="xs"
      data-test-subj="entity-analytics-toolbar-updated-at"
      tabIndex={0}
    >
      {displayText}
    </EuiText>
  );
});

LastUpdated.displayName = 'LastUpdated';
