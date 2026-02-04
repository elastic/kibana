/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { AnalyzerPreviewContainer } from './analyzer_preview_container';
import { SessionPreviewContainer } from './session_preview_container';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { VISUALIZATIONS_TEST_ID } from './test_ids';
import { GraphPreviewContainer } from './graph_preview_container';
import { useDocumentDetailsContext } from '../../shared/context';
import { useGraphPreview } from '../../shared/hooks/use_graph_preview';
import { FLYOUT_STORAGE_KEYS } from '../../shared/constants/local_storage';

const KEY = 'visualizations';

/**
 * Visualizations section in overview. It contains analyzer preview and session view preview.
 */
export const VisualizationsSection = memo(() => {
  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: KEY,
    defaultValue: false,
  });
  const { dataAsNestedObject, getFieldsData, dataFormattedForFieldBrowser } =
    useDocumentDetailsContext();

  // Decide whether to show the graph preview or not
  const { shouldShowGraph } = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
    dataFormattedForFieldBrowser,
  });

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.visualizations.sectionTitle"
          defaultMessage="Visualizations"
        />
      }
      localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={KEY}
      data-test-subj={VISUALIZATIONS_TEST_ID}
    >
      <SessionPreviewContainer />
      <EuiSpacer />
      <AnalyzerPreviewContainer />
      {shouldShowGraph && (
        <>
          <EuiSpacer />
          <GraphPreviewContainer />
        </>
      )}
    </ExpandableSection>
  );
});

VisualizationsSection.displayName = 'VisualizationsSection';
