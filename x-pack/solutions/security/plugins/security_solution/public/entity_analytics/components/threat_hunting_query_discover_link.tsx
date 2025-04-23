/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { ThreatHuntingQueryQuery } from '../../../common/api/entity_analytics/threat_hunting/common.gen';
import { useOpenThreatHuntingQueryInDiscover } from '../hooks/use_open_threat_hunting_query_in_discover';

export const ThreatHuntingQueryDiscoverLink: React.FC<{ query: ThreatHuntingQueryQuery }> = ({
  query,
}) => {
  const discoverLogsLink = useOpenThreatHuntingQueryInDiscover(query);

  if (!discoverLogsLink) {
    return null;
  }

  return (
    <EuiLink href={discoverLogsLink} target="_blank">
      {'Open in Discover'}
    </EuiLink>
  );
};
