/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDraggable,
  EuiPanelProps,
  EuiPanel,
  EuiFlexGroup,
  EuiIcon,
  EuiText,
  EuiFlexItem,
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ReadStreamDefinition, isDissectProcessor, isGrokProcessor } from '@kbn/streams-schema';
import { useBoolean } from '@kbn/react-hooks';
import { EditProcessorFlyout } from './flyout';
import { ProcessorDefinition } from './types';

export const DraggableProcessorListItem = ({
  processor,
  idx,
  ...props
}: Omit<ProcessorListItemProps, 'hasShadow'> & { idx: number }) => (
  <EuiDraggable
    index={idx}
    spacing="m"
    draggableId={processor.id}
    hasInteractiveChildren
    style={{
      paddingLeft: 0,
      paddingRight: 0,
    }}
  >
    {(_provided, state) => (
      <ProcessorListItem processor={processor} hasShadow={state.isDragging} {...props} />
    )}
  </EuiDraggable>
);

interface ProcessorListItemProps {
  definition: ReadStreamDefinition;
  processor: ProcessorDefinition;
  hasShadow: EuiPanelProps['hasShadow'];
}

const ProcessorListItem = ({
  processor,
  definition,
  hasShadow = false,
}: ProcessorListItemProps) => {
  const [isEditProcessorOpen, { on: openEditProcessor, off: closeEditProcessor }] = useBoolean();

  const type = getProcessorType(processor);
  const description = getProcessorDescription(processor);

  return (
    <EuiPanel hasBorder hasShadow={hasShadow} paddingSize="s">
      <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
        <EuiIcon type="grab" />
        <EuiText component="span" size="s">
          {type.toUpperCase()}
        </EuiText>
        <EuiFlexItem>
          <EuiText component="span" size="s" color="subdued">
            {description}
          </EuiText>
        </EuiFlexItem>
        <EuiButtonIcon
          onClick={openEditProcessor}
          iconType="pencil"
          color="text"
          size="s"
          aria-label={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.editProcessorAction',
            { defaultMessage: 'Edit {type} processor', values: { type } }
          )}
        />
      </EuiFlexGroup>
      {isEditProcessorOpen && (
        <EditProcessorFlyout
          key={`edit-processor`}
          definition={definition}
          onClose={closeEditProcessor}
          processor={processor}
        />
      )}
    </EuiPanel>
  );
};

const getProcessorType = (processor: ProcessorDefinition) => {
  if (isGrokProcessor(processor.config)) {
    return 'grok';
  } else if (isDissectProcessor(processor.config)) {
    return 'dissect';
  }

  return '';
};

const getProcessorDescription = (processor: ProcessorDefinition) => {
  if (isGrokProcessor(processor.config)) {
    return processor.config.grok.patterns.join(' • ');
  } else if (isDissectProcessor(processor.config)) {
    return processor.config.dissect.pattern;
  }

  return '';
};
