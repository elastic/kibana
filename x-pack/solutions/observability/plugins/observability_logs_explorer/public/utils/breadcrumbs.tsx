/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOGS_APP_ID, OBSERVABILITY_LOGS_EXPLORER_APP_ID } from '@kbn/deeplinks-observability';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { useMemo } from 'react';
import { useBreadcrumbs as observabilityUseBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { logsExplorerAppTitle, logsAppTitle } from '../../common/translations';

export const useBreadcrumbs = () => {
  const logsLinkProps = useLinkProps({ app: LOGS_APP_ID });
  const logsExplorerLinkProps = useLinkProps({ app: OBSERVABILITY_LOGS_EXPLORER_APP_ID });
  const classicCrumbs = useMemo(() => {
    return [
      {
        text: logsAppTitle,
        ...logsLinkProps,
      },
      {
        text: logsExplorerAppTitle,
        ...logsExplorerLinkProps,
      },
    ];
  }, [logsExplorerLinkProps, logsLinkProps]);

  observabilityUseBreadcrumbs(classicCrumbs, { classicOnly: true });
};
