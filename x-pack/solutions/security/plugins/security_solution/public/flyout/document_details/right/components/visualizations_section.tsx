/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { useExpandSection } from '../hooks/use_expand_section';
import { AnalyzerPreviewContainer } from './analyzer_preview_container';
import { SessionPreviewContainer } from './session_preview_container';
import { ExpandableSection } from './expandable_section';
import { VISUALIZATIONS_TEST_ID } from './test_ids';
import { GraphPreviewContainer } from './graph_preview_container';
import { useDocumentDetailsContext } from '../../shared/context';
import { useGraphPreview } from '../../shared/hooks/use_graph_preview';
import {
  ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING,
  ENABLE_GRAPH_VISUALIZATION_SETTING,
} from '../../../../../common/constants';

const KEY = 'visualizations';

/**
 * Visualizations section in overview. It contains analyzer preview and session view preview.
 */
export const VisualizationsSection = memo(() => {
  const expanded = useExpandSection({ title: KEY, defaultValue: false });
  const { dataAsNestedObject, getFieldsData, dataFormattedForFieldBrowser } =
    useDocumentDetailsContext();

  const [visualizationInFlyoutEnabled] = useUiSetting$<boolean>(
    ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING
  );

  const [graphVisualizationEnabled] = useUiSetting$<boolean>(ENABLE_GRAPH_VISUALIZATION_SETTING);

  // Decide whether to show the graph preview or not
  const { hasGraphRepresentation } = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
    dataFormattedForFieldBrowser,
  });

  const shouldShowGraphPreview =
    visualizationInFlyoutEnabled && graphVisualizationEnabled && hasGraphRepresentation;

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.visualizations.sectionTitle"
          defaultMessage="Visualizations"
        />
      }
      localStorageKey={KEY}
      data-test-subj={VISUALIZATIONS_TEST_ID}
    >
      <SessionPreviewContainer />
      <EuiSpacer />
      <AnalyzerPreviewContainer />
      {shouldShowGraphPreview && (
        <>
          <EuiSpacer />
          <GraphPreviewContainer />
        </>
      )}
    </ExpandableSection>
  );
});

VisualizationsSection.displayName = 'VisualizationsSection';
