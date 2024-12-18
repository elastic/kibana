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
  EuiConfirmModal,
  useGeneratedHtmlId,
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

interface ProcessorFlyoutProps {
  definition: ReadStreamDefinition;
  onClose: () => void;
}

export function AddProcessorFlyout({ definition, onClose }: ProcessorFlyoutProps) {
  const { fields, inheritedFields } = definition;

  const [selectedField, setSelectedField] = useState('');
  const [selectedType, setSelectedType] = useState('');

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
        <ProcessorFieldSelector
          fields={mergedFields}
          value={selectedField}
          onChange={setSelectedField}
        />
        <ProcessorTypeSelector value={selectedType} onChange={setSelectedType} />
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

  const discardModalId = useGeneratedHtmlId();

  const discardChanges = () => {
    closeDiscardModal();
    onClose();
  };

  return (
    <EuiFlyoutResizable onClose={onClose}>
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
        <EuiConfirmModal
          aria-labelledby={discardModalId}
          title={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.discardModalTitle',
            { defaultMessage: 'Discard in progress changes?' }
          )}
          titleProps={{ id: discardModalId }}
          onCancel={closeDiscardModal}
          onConfirm={discardChanges}
          cancelButtonText={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.discardModalCancel',
            { defaultMessage: 'Keep editing' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.discardModalConfirm',
            { defaultMessage: 'Discard work in progress' }
          )}
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.discardModalBody',
              { defaultMessage: 'You will lose all unsaved work in progress for this processor.' }
            )}
          </p>
        </EuiConfirmModal>
      )}
    </EuiFlyoutResizable>
  );
}

interface BaseSelectorProps {
  value: EuiSuperSelectProps['valueOfSelected'];
  onChange: EuiSuperSelectProps['onChange'];
}

interface ProcessorFieldSelectorProps extends BaseSelectorProps {
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
        { defaultMessage: 'Field to process' }
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

const ProcessorTypeSelector = ({ value, onChange }: BaseSelectorProps) => {
  const options: Array<EuiSuperSelectOption<string>> = [
    { value: 'grok', inputDisplay: 'Grok' },
    { value: 'dissect', inputDisplay: 'Dissect' },
  ];

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.typeSelectorLabel',
        { defaultMessage: 'Processor type' }
      )}
    >
      <EuiSuperSelect
        options={options}
        valueOfSelected={value}
        onChange={onChange}
        fullWidth
        placeholder={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.typeSelectorPlaceholder',
          { defaultMessage: 'Grok, Dissect ...' }
        )}
      />
    </EuiFormRow>
  );
};
