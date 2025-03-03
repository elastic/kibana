/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import type { EuiButtonGroupOptionProps } from '@elastic/eui/src/components/button/button_group/button_group';
import { useExpandableFlyoutState } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  uiMetricService,
  GRAPH_INVESTIGATION,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { useDocumentDetailsContext } from '../../shared/context';
import {
  VISUALIZE_TAB_BUTTON_GROUP_TEST_ID,
  VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON_TEST_ID,
  VISUALIZE_TAB_GRAPH_VISUALIZATION_BUTTON_TEST_ID,
  VISUALIZE_TAB_SESSION_VIEW_BUTTON_TEST_ID,
} from './test_ids';
import { ANALYZE_GRAPH_ID, AnalyzeGraph } from '../components/analyze_graph';
import { SESSION_VIEW_ID, SessionView } from '../components/session_view';
import { ALERTS_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { GRAPH_ID, GraphVisualization } from '../components/graph_visualization';
import { useGraphPreview } from '../../shared/hooks/use_graph_preview';
import { METRIC_TYPE } from '../../../../common/lib/telemetry';
import { ENABLE_GRAPH_VISUALIZATION_SETTING } from '../../../../../common/constants';

const visualizeButtons: EuiButtonGroupOptionProps[] = [
  {
    id: SESSION_VIEW_ID,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.visualize.sessionViewButtonLabel"
        defaultMessage="Session View"
      />
    ),
    'data-test-subj': VISUALIZE_TAB_SESSION_VIEW_BUTTON_TEST_ID,
  },
  {
    id: ANALYZE_GRAPH_ID,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.visualize.analyzerGraphButtonLabel"
        defaultMessage="Analyzer Graph"
      />
    ),
    'data-test-subj': VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON_TEST_ID,
  },
];

const graphVisualizationButton: EuiButtonGroupOptionProps = {
  id: GRAPH_ID,
  iconType: 'beaker',
  iconSide: 'right',
  toolTipProps: {
    title: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.visualize.graphVisualizationButton.technicalPreviewLabel"
        defaultMessage="Technical Preview"
      />
    ),
  },
  toolTipContent: i18n.translate(
    'xpack.securitySolution.flyout.left.visualize.graphVisualizationButton.technicalPreviewTooltip',
    {
      defaultMessage:
        'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
    }
  ),
  label: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.left.visualize.graphVisualizationButtonLabel"
      defaultMessage="Graph view"
    />
  ),
  'data-test-subj': VISUALIZE_TAB_GRAPH_VISUALIZATION_BUTTON_TEST_ID,
};

/**
 * Visualize view displayed in the document details expandable flyout left section
 */
export const VisualizeTab = memo(() => {
  const { getFieldsData, dataAsNestedObject, dataFormattedForFieldBrowser } =
    useDocumentDetailsContext();
  const panels = useExpandableFlyoutState();
  const [activeVisualizationId, setActiveVisualizationId] = useState(
    panels.left?.path?.subTab ?? SESSION_VIEW_ID
  );
  const { startTransaction } = useStartTransaction();
  const onChangeCompressed = useCallback(
    (optionId: string) => {
      setActiveVisualizationId(optionId);
      if (optionId === ANALYZE_GRAPH_ID) {
        startTransaction({ name: ALERTS_ACTIONS.OPEN_ANALYZER });
      } else if (optionId === GRAPH_ID) {
        uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, GRAPH_INVESTIGATION);
      }
    },
    [startTransaction]
  );

  useEffect(() => {
    if (panels.left?.path?.subTab) {
      setActiveVisualizationId(panels.left?.path?.subTab);

      if (panels.left?.path?.subTab === GRAPH_ID) {
        uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, GRAPH_INVESTIGATION);
      }
    }
  }, [panels.left?.path?.subTab]);

  // Decide whether to show the graph preview or not
  const { hasGraphRepresentation } = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
    dataFormattedForFieldBrowser,
  });

  const [graphVisualizationEnabled] = useUiSetting$<boolean>(ENABLE_GRAPH_VISUALIZATION_SETTING);

  const options = [...visualizeButtons];

  if (hasGraphRepresentation && graphVisualizationEnabled) {
    options.push(graphVisualizationButton);
  }

  return (
    <>
      <EuiButtonGroup
        color="primary"
        name="coarsness"
        legend={i18n.translate(
          'xpack.securitySolution.flyout.left.visualize.buttonGroupLegendLabel',
          {
            defaultMessage: 'Visualize options',
          }
        )}
        options={options}
        idSelected={activeVisualizationId}
        onChange={(id) => onChangeCompressed(id)}
        buttonSize="compressed"
        isFullWidth
        data-test-subj={VISUALIZE_TAB_BUTTON_GROUP_TEST_ID}
      />
      <EuiSpacer size="m" />
      {activeVisualizationId === SESSION_VIEW_ID && <SessionView />}
      {activeVisualizationId === ANALYZE_GRAPH_ID && <AnalyzeGraph />}
      {activeVisualizationId === GRAPH_ID && <GraphVisualization />}
    </>
  );
});

VisualizeTab.displayName = 'VisualizeTab';
