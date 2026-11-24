/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { EuiButtonGroup, EuiCodeBlock, useEuiTheme } from '@elastic/eui';
import { GraphMinimap, WorkflowGraph } from './workflow_graph';
import * as i18n from './translations';

const VIEW_OPTIONS = [
  { id: 'graph', label: i18n.GRAPH_VIEW, iconType: 'workflow', toolTipContent: i18n.GRAPH_VIEW },
  { id: 'yaml', label: i18n.YAML_VIEW, iconType: 'code', toolTipContent: i18n.YAML_VIEW },
];

export interface WorkflowViewerProps {
  yaml: string;
  /** Max height of the graph / YAML area, in px. */
  maxHeight?: number;
  /** Show the minimap in the graph view. Off for narrow containers. */
  showMinimap?: boolean;
}

/** Full workflow view with a graph/YAML switcher pinned to the bottom of the flyout body. */
export const WorkflowViewer: React.FC<WorkflowViewerProps> = React.memo(
  ({ yaml, maxHeight = 900, showMinimap = true }) => {
    const { euiTheme } = useEuiTheme();
    const [selectedView, setSelectedView] = useState('graph');

    return (
      <div
        css={css`
          position: relative;
        `}
      >
        {selectedView === 'yaml' ? (
          <EuiCodeBlock
            language="yaml"
            fontSize="s"
            paddingSize="m"
            isCopyable
            overflowHeight={maxHeight}
          >
            {yaml}
          </EuiCodeBlock>
        ) : (
          <WorkflowGraph maxHeight={maxHeight} />
        )}
        <div
          css={css`
            position: sticky;
            bottom: 0;
            height: 0;
            z-index: 1;
            container-type: inline-size;
          `}
        >
          {selectedView === 'graph' && showMinimap && (
            <div
              css={css`
                position: absolute;
                right: ${euiTheme.size.base};
                bottom: ${euiTheme.size.base};
              `}
            >
              <GraphMinimap />
            </div>
          )}
          <div
            css={css`
              position: absolute;
              bottom: ${euiTheme.size.base};
              left: 50%;
              transform: translateX(-50%);
              padding: ${euiTheme.size.xs};
              background: ${euiTheme.colors.backgroundBasePlain};
              border-radius: ${euiTheme.border.radius.medium};
              box-shadow: 0 0 2px 0 rgba(43, 57, 79, 0.16), 0 4px 8px 0 rgba(43, 57, 79, 0.12),
                0 8px 16px 0 rgba(43, 57, 79, 0.06);
            `}
            data-test-subj="workflowMigrationViewToggle"
          >
            <EuiButtonGroup
              legend={i18n.VIEW_TOGGLE_LEGEND}
              options={VIEW_OPTIONS}
              idSelected={selectedView}
              onChange={setSelectedView}
              buttonSize="compressed"
              isIconOnly
            />
          </div>
        </div>
      </div>
    );
  }
);
WorkflowViewer.displayName = 'WorkflowViewer';
