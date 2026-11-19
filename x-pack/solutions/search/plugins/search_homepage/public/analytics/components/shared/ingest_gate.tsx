/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AnalyticsLinks, AnalyticsSampleData } from '../../types';
import { ConnectPanel } from './connect_panel';
import type { AnalyticsPageId } from './page_ids';
import { getPageTestSubj } from './page_ids';

interface IngestGateProps {
  page: AnalyticsPageId;
  /** Omit when the surrounding view already has a heading for this task. */
  title?: string;
  links: Pick<
    AnalyticsLinks,
    'canUseIntegrations' | 'isSourceAvailable' | 'openSource' | 'browseIntegrations'
  >;
  sampleData: AnalyticsSampleData;
  /** Called once the sample events are in the cluster. */
  onSampleInstalled: () => void;
}

/**
 * All an empty deployment gets to see: the ways to add data. There is no way past it; the page
 * moves on by itself when the cluster holds data.
 */
export const IngestGate = ({
  page,
  title,
  links,
  sampleData,
  onSampleInstalled,
}: IngestGateProps): React.JSX.Element => (
  <div data-test-subj={getPageTestSubj(page, 'IngestGate')}>
    <ConnectPanel
      page={page}
      title={title}
      links={links}
      sampleData={sampleData}
      onSampleInstalled={onSampleInstalled}
    />
  </div>
);
