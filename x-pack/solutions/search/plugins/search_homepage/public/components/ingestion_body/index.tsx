/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiFlexGroup, EuiHorizontalRule } from '@elastic/eui';

import { useUsageTracker } from '../../hooks/use_usage_tracker';

import { AlternateSolutions } from '../alternate_solutions/alternate_solutions';
import { DiveDeeperWithElasticsearch } from '../dive_deeper/dive_deeper_with_elasticsearch';
import { Footer } from '../footer/footer';
import { AnalyticsEvents } from '../../analytics/constants';
import { AISearchCapabilities } from '../ai_search_capabilities/ai_search_capabilities';

import { ConnectToElasticsearch } from './connect_to_elasticsearch';
import { IngestYourContentSection } from './ingest_your_content_section';

export const SearchHomepageIngestionVariantBody = () => {
  const usageTracker = useUsageTracker();

  useEffect(() => {
    usageTracker.load(AnalyticsEvents.ingestionCTAVariantLoaded);
  }, [usageTracker]);

  return (
    <KibanaPageTemplate.Section alignment="top" restrictWidth={false} grow>
      <EuiFlexGroup gutterSize="l" direction="column">
        <ConnectToElasticsearch />
        <EuiHorizontalRule />
        <IngestYourContentSection />
        <EuiHorizontalRule />
        <AISearchCapabilities />
        <EuiHorizontalRule />
        <DiveDeeperWithElasticsearch />
        <EuiHorizontalRule />
        <AlternateSolutions />
        <EuiHorizontalRule />
        <Footer />
      </EuiFlexGroup>
    </KibanaPageTemplate.Section>
  );
};
