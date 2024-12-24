/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { getLogsLocatorsFromUrlService, LogViewReference } from '@kbn/logs-shared-plugin/common';
import { OpenInLogsExplorerButton } from '@kbn/logs-shared-plugin/public';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';

interface LogsLinkToStreamProps {
  startTime: number;
  endTime: number;
  query: string;
  logView: LogViewReference;
}

export const LogsLinkToStream = ({ startTime, endTime, query, logView }: LogsLinkToStreamProps) => {
  const { services } = useKibanaContextForPlugin();
  const { share } = services;
  const { logsLocator } = getLogsLocatorsFromUrlService(share.url);

  return (
    <OpenInLogsExplorerButton
      href={logsLocator.getRedirectUrl({
        time: endTime,
        timeRange: {
          startTime,
          endTime,
        },
        filter: query,
        logView,
      })}
      testSubject="hostsView-logs-link-to-stream-button"
      flush="both"
    />
  );
};
