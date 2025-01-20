/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import {
  EuiButton,
  EuiCard,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTourStep,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Workflow, WorkflowId, workflows } from '../../code_examples/workflows';
import { useGuideTour } from './hooks/use_guide_tour';

interface PopoverCardProps {
  workflow: Workflow;
  isSelected: boolean;
  onChange: (workflowId: WorkflowId) => void;
}

const PopoverCard: React.FC<PopoverCardProps> = ({ workflow, onChange, isSelected }) => (
  <EuiCard
    title={workflow.title}
    hasBorder
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
);

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
  container,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { tourIsOpen, setTourIsOpen } = useGuideTour();

  const onPopoverClick = () => {
    setIsPopoverOpen(() => !isPopoverOpen);
  };

  useEffect(() => {
    closePopover();
  }, [selectedWorkflowId]);

  const closePopover = () => setIsPopoverOpen(false);

  const PopoverButton = (
    <EuiButton
      color="text"
      iconType="arrowDown"
      iconSide="right"
      onClick={onPopoverClick}
      data-test-subj="workflowSelectorButton"
    >
      {i18n.translate('xpack.searchIndices.guideSelector.selectWorkflow', {
        defaultMessage: 'Select a guide',
      })}
    </EuiButton>
  );

  const Popover = () => (
    <EuiPopover
      anchorPosition="downRight"
      button={PopoverButton}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      title="Select a workflow"
      container={container || undefined}
    >
      <>
        <EuiFlexGroup gutterSize="m" style={{ maxWidth: '960px' }}>
          {workflows.map((workflow) => (
            <EuiFlexItem key={workflow.id}>
              <PopoverCard
                workflow={workflow}
                isSelected={workflow.id === selectedWorkflowId}
                onChange={(value) => onChange(value)}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </>
    </EuiPopover>
  );

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
      title={i18n.translate('xpack.searchIndices.touTitle', {
        defaultMessage: 'New guides available!',
      })}
      anchorPosition="rightUp"
    >
      <Popover />
    </EuiTourStep>
  ) : (
    <Popover />
  );
};
