/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  getLogsLocatorFromUrlService,
  type LogViewReference,
} from '@kbn/logs-shared-plugin/common';
import { OpenInLogsExplorerButton } from '@kbn/logs-shared-plugin/public';
import moment from 'moment';
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
  const logsLocator = getLogsLocatorFromUrlService(share.url)!;

  return (
    <OpenInLogsExplorerButton
      href={logsLocator.getRedirectUrl({
        timeRange: {
          from: moment(startTime).toISOString(),
          to: moment(endTime).toISOString(),
        },
        filter: query,
        logView,
      })}
      testSubject="hostsView-logs-link-to-stream-button"
      flush="both"
    />
  );
};
