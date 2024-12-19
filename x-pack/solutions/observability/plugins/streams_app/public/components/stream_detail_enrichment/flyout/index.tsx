/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFlyoutResizable,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiForm,
  EuiFormRow,
  EuiFlexGroup,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiSuperSelectProps,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiIcon,
  EuiButtonIcon,
  EuiFlexItem,
  EuiText,
  EuiFieldText,
  EuiPanel,
  euiDragDropReorder,
  DragDropContextProps,
  EuiDraggable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import { useBoolean } from '@kbn/react-hooks';
import {
  FieldDefinition,
  ProcessingDefinition,
  ReadStreamDefinition,
} from '@kbn/streams-plugin/common';
import React, { PropsWithChildren, useMemo, useState } from 'react';
import { type } from 'io-ts';
import { DiscardChangesModal } from '../discard_changes_modal';
import { ProcessorType } from '../types';
import { ProcessorTypeSelector } from './processor_type_selector';
import { SortableList } from '../sortable_list';

interface ProcessorFlyoutProps {
  definition: ReadStreamDefinition;
  onClose: () => void;
}

export function AddProcessorFlyout({ definition, onClose }: ProcessorFlyoutProps) {
  const { fields, inheritedFields } = definition;

  const [selectedType, setSelectedType] = useState<ProcessorType>('grok');
  const [selectedField, setSelectedField] = useState('message');

  const mergedFields = [...fields, ...inheritedFields];

  return (
    <ProcessorFlyout
      onClose={onClose}
      title={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.titleAdd',
        { defaultMessage: 'Add processor' }
      )}
      confirmButton={
        <EuiButton
        // isDisabled={isSaving || !saveChanges}
        // onClick={() => saveChanges && saveChanges()}
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.confirmAddProcessor',
            { defaultMessage: 'Add processor' }
          )}
        </EuiButton>
      }
    >
      <EuiForm component="form" fullWidth>
        <ProcessorTypeSelector value={selectedType} onChange={setSelectedType} />
        <ProcessorFieldSelector
          fields={mergedFields}
          value={selectedField}
          onChange={setSelectedField}
        />
        {selectedType === 'grok' && <GrokProcessorFields />}
      </EuiForm>
    </ProcessorFlyout>
  );
}

export function EditProcessorFlyout({
  definition,
  processor,
  onClose,
}: ProcessorFlyoutProps & { processor: ProcessingDefinition }) {
  return (
    <ProcessorFlyout
      onClose={onClose}
      title={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.titleEdit',
        { defaultMessage: 'Edit processor' }
      )}
      subHeader={
        <EuiCallOut
          title={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.calloutEdit',
            { defaultMessage: 'Outcome preview is not available during edition' }
          )}
          iconType="iInCircle"
        />
      }
      confirmButton={
        <EuiButton
        // isDisabled={isSaving || !saveChanges}
        // onClick={() => saveChanges && saveChanges()}
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.confirmEditProcessor',
            { defaultMessage: 'Update processor' }
          )}
        </EuiButton>
      }
    />
  );
}

interface ProcessorFlyoutWrapperProps {
  confirmButton?: React.ReactNode;
  onClose: () => void;
  subHeader?: React.ReactNode;
  title: string;
}

function ProcessorFlyout({
  children,
  confirmButton,
  onClose,
  subHeader,
  title,
}: PropsWithChildren<ProcessorFlyoutWrapperProps>) {
  const [isDiscardModalOpen, { on: openDiscardModal, off: closeDiscardModal }] = useBoolean();

  const discardChanges = () => {
    closeDiscardModal();
    onClose();
  };

  return (
    <EuiFlyoutResizable onClose={openDiscardModal}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      {subHeader}
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty iconType="cross" onClick={openDiscardModal}>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.cancel',
              { defaultMessage: 'Cancel' }
            )}
          </EuiButtonEmpty>
          {confirmButton}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
      {isDiscardModalOpen && (
        <DiscardChangesModal onCancel={closeDiscardModal} onConfirm={discardChanges} />
      )}
    </EuiFlyoutResizable>
  );
}

interface ProcessorFieldSelectorProps {
  value: EuiSuperSelectProps['valueOfSelected'];
  onChange: EuiSuperSelectProps['onChange'];
  fields: FieldDefinition[];
}

const ProcessorFieldSelector = ({ fields, value, onChange }: ProcessorFieldSelectorProps) => {
  // Should we filter the available options by "match_only_text" only?
  const options: Array<EuiSuperSelectOption<string>> = useMemo(
    () =>
      fields.map((field) => ({
        value: field.name,
        inputDisplay: field.type ? (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            {field.type && <FieldIcon type={field.type} size="s" />}
            {field.name}
          </EuiFlexGroup>
        ) : (
          field.name
        ),
      })),
    [fields]
  );

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.fieldSelectorLabel',
        { defaultMessage: 'Field' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.fieldSelectorHelpText',
        { defaultMessage: 'Field to search for matches.' }
      )}
    >
      <EuiSuperSelect
        options={options}
        valueOfSelected={value}
        onChange={onChange}
        fullWidth
        placeholder={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.fieldSelectorPlaceholder',
          { defaultMessage: 'message, event.original ...' }
        )}
      />
    </EuiFormRow>
  );
};

interface GrokEditorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

const GrokProcessorFields = ({ processor }) => {
  const [patterns, setPatterns] = useState(processor?.config.patterns ?? []);

  return (
    <>
      <GrokEditor patterns={patterns} onChange={setPatterns} />
    </>
  );
};

const GrokEditor = ({ patterns, onChange }: GrokEditorProps) => {
  const handlerPatternDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    if (source && destination) {
      const items = euiDragDropReorder(patterns, source.index, destination.index);
      onChange(items);
    }
  };

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.grokEditorLabel',
        { defaultMessage: 'Grok pattern editor' }
      )}
    >
      <EuiPanel color="subdued" paddingSize="m">
        <SortableList onDragItem={handlerPatternDrag}>
          {patterns.map((pattern, idx) => (
            <EuiDraggable
              key={pattern}
              index={idx}
              spacing="m"
              draggableId={pattern}
              hasInteractiveChildren
              style={{
                paddingLeft: 0,
                paddingRight: 0,
              }}
            >
              <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
                <EuiIcon type="grab" />
                <EuiFieldText compressed />
              </EuiFlexGroup>
            </EuiDraggable>
          ))}
        </SortableList>
      </EuiPanel>
    </EuiFormRow>
  );
};
