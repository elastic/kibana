/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { HostsContent } from './hosts_content';
import { UnifiedSearchProvider } from '../hooks/use_unified_search';
import { HostsTimeRangeMetadataProvider } from '../hooks/use_hosts_metadata_provider';
import { SearchBar } from './search_bar/search_bar';

export const HostsContainer = () => {
  return (
    <UnifiedSearchProvider>
      <HostsTimeRangeMetadataProvider>
        <SearchBar />
        <EuiSpacer size="m" />
        <HostsContent />
      </HostsTimeRangeMetadataProvider>
    </UnifiedSearchProvider>
  );
};
