/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import { useColors } from '../use_colors';
import { StyledDescriptionList } from '../panels/styles';
import { CubeForProcess } from '../panels/cube_for_process';
import { GeneratedText } from '../generated_text';
import {
  StyledEuiDescriptionListTitle,
  StyledEuiDescriptionListDescription,
  StyledEuiButtonIcon,
  COLUMN_WIDTH,
} from './styles';

// This component defines the cube legend that allows users to identify the meaning of the cubes
// Should be updated to be dynamic if and when non process based resolvers are possible
export const NodeLegend = ({
  id,
  closePopover,
  setActivePopover,
  isOpen,
}: {
  id: string;
  closePopover: () => void;
  setActivePopover: (value: 'nodeLegend') => void;
  isOpen: boolean;
}) => {
  const setAsActivePopover = useCallback(() => setActivePopover('nodeLegend'), [setActivePopover]);
  const colorMap = useColors();

  const nodeLegendButtonTitle = i18n.translate(
    'xpack.securitySolution.resolver.graphControls.nodeLegendButtonTitle',
    {
      defaultMessage: 'Node Legend',
    }
  );

  return (
    <EuiPopover
      button={
        <StyledEuiButtonIcon
          data-test-subj="resolver:graph-controls:node-legend-button"
          size="m"
          title={nodeLegendButtonTitle}
          aria-label={nodeLegendButtonTitle}
          onClick={setAsActivePopover}
          iconType="node"
          $backgroundColor={colorMap.graphControlsBackground}
          $iconColor={colorMap.graphControls}
          $borderColor={colorMap.graphControlsBorderColor}
        />
      }
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="leftCenter"
    >
      <EuiPopoverTitle style={{ textTransform: 'uppercase' }}>
        {i18n.translate('xpack.securitySolution.resolver.graphControls.nodeLegend', {
          defaultMessage: 'legend',
        })}
      </EuiPopoverTitle>
      <div
        // Limit the width based on UX design
        style={{ maxWidth: '212px' }}
      >
        <StyledDescriptionList
          data-test-subj="resolver:graph-controls:node-legend"
          type="column"
          columnWidths={COLUMN_WIDTH}
          align="left"
          compressed
        >
          <>
            <StyledEuiDescriptionListTitle data-test-subj="resolver:graph-controls:node-legend:title">
              <CubeForProcess
                id={id}
                size="2.5em"
                data-test-subj="resolver:node-detail:title-icon"
                state="running"
              />
            </StyledEuiDescriptionListTitle>
            <StyledEuiDescriptionListDescription data-test-subj="resolver:graph-controls:node-legend:description">
              <GeneratedText>
                {i18n.translate(
                  'xpack.securitySolution.resolver.graphControls.runningProcessCube',
                  {
                    defaultMessage: 'Running Process',
                  }
                )}
              </GeneratedText>
            </StyledEuiDescriptionListDescription>
            <StyledEuiDescriptionListTitle data-test-subj="resolver:graph-controls:node-legend:title">
              <CubeForProcess
                id={id}
                size="2.5em"
                data-test-subj="resolver:node-detail:title-icon"
                state="terminated"
              />
            </StyledEuiDescriptionListTitle>
            <StyledEuiDescriptionListDescription data-test-subj="resolver:graph-controls:node-legend:description">
              <GeneratedText>
                {i18n.translate(
                  'xpack.securitySolution.resolver.graphControls.terminatedProcessCube',
                  {
                    defaultMessage: 'Terminated Process',
                  }
                )}
              </GeneratedText>
            </StyledEuiDescriptionListDescription>
            <StyledEuiDescriptionListTitle data-test-subj="resolver:graph-controls:node-legend:title">
              <CubeForProcess
                id={id}
                size="2.5em"
                data-test-subj="resolver:node-detail:title-icon"
                state="loading"
              />
            </StyledEuiDescriptionListTitle>
            <StyledEuiDescriptionListDescription data-test-subj="resolver:graph-controls:node-legend:description">
              <GeneratedText>
                {i18n.translate(
                  'xpack.securitySolution.resolver.graphControls.currentlyLoadingCube',
                  {
                    defaultMessage: 'Loading Process',
                  }
                )}
              </GeneratedText>
            </StyledEuiDescriptionListDescription>
            <StyledEuiDescriptionListTitle data-test-subj="resolver:graph-controls:node-legend:title">
              <CubeForProcess
                id={id}
                size="2.5em"
                data-test-subj="resolver:node-detail:title-icon"
                state="error"
              />
            </StyledEuiDescriptionListTitle>
            <StyledEuiDescriptionListDescription data-test-subj="resolver:graph-controls:node-legend:description">
              <GeneratedText>
                {i18n.translate('xpack.securitySolution.resolver.graphControls.errorCube', {
                  defaultMessage: 'Error Process',
                })}
              </GeneratedText>
            </StyledEuiDescriptionListDescription>
          </>
        </StyledDescriptionList>
      </div>
    </EuiPopover>
  );
};
