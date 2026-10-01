/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecurityAppHeader } from '../../common/components/app_header';
import type { LastEventTimeProps } from '../../common/components/last_event_time';
import { useLastEventTimeText } from '../../common/components/last_event_time/use_last_event_time_text';

interface LastEventTimeHeaderProps {
  title: string;
  docLink: string;
  indexKey: LastEventTimeProps['indexKey'];
  indexNames: string[];
}

/**
 * Page header with last-event as description
 * Set as isolated component so last-event query mounts only with this component
 */
export const LastEventTimeHeader = React.memo<LastEventTimeHeaderProps>(
  ({ title, docLink, indexKey, indexNames }) => {
    const lastEventTimeText = useLastEventTimeText({ indexKey, indexNames });

    return (
      <SecurityAppHeader
        title={title}
        description={lastEventTimeText}
        spacing="largeBleed"
        docLink={docLink}
      />
    );
  }
);

LastEventTimeHeader.displayName = 'LastEventTimeHeader';
