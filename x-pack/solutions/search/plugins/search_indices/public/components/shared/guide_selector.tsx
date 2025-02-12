/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCard, EuiText, EuiFlexGroup, EuiFlexItem, EuiTourStep } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WorkflowId, workflows } from '../../code_examples/workflows';
import { useGuideTour } from './hooks/use_guide_tour';

interface GuideSelectorProps {
  selectedWorkflowId: WorkflowId;
  onChange: (workflow: WorkflowId) => void;
  showTour: boolean;
  container?: HTMLElement | null;
}

export const GuideSelector: React.FC<GuideSelectorProps> = ({
  selectedWorkflowId,
  onChange,
  showTour,
}) => {
  const { tourIsOpen, setTourIsOpen } = useGuideTour();

  return showTour ? (
    <EuiTourStep
      content={
        <EuiText>
          <p>
            {i18n.translate('xpack.searchIndices.tourDescription', {
              defaultMessage: 'Explore additional guides for setting up your Elasticsearch index.',
            })}
          </p>
        </EuiText>
      }
      isStepOpen={tourIsOpen}
      minWidth={300}
      onFinish={() => setTourIsOpen(false)}
      step={1}
      stepsTotal={1}
      title={i18n.translate('xpack.searchIndices.tourTitle', {
        defaultMessage: 'New guides available!',
      })}
      anchorPosition="rightUp"
    >
      <GuideSelectorTiles selectedWorkflowId={selectedWorkflowId} onChange={onChange} />
    </EuiTourStep>
  ) : (
    <GuideSelectorTiles selectedWorkflowId={selectedWorkflowId} onChange={onChange} />
  );
};

const GuideSelectorTiles: React.FC<Pick<GuideSelectorProps, 'selectedWorkflowId' | 'onChange'>> = ({
  selectedWorkflowId,
  onChange,
}) => {
  return (
    <EuiFlexGroup gutterSize="m">
      {workflows.map((workflow) => {
        const isSelected = selectedWorkflowId === workflow.id;
        return (
          <EuiFlexItem key={workflow.id}>
            <EuiCard
              title={workflow.title}
              hasBorder={!isSelected}
              titleSize="xs"
              description={
                <EuiText color="subdued" size="s">
                  {workflow.summary}
                </EuiText>
              }
              selectable={{
                onClick: () => onChange(workflow.id),
                isSelected,
              }}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
