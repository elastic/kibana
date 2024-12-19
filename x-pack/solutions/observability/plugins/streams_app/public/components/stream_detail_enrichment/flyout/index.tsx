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
  EuiLink,
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
import { FormattedMessage } from '@kbn/i18n-react';
import { DiscardChangesModal } from '../discard_changes_modal';
import { useKibana } from '../../../hooks/use_kibana';

interface ProcessorFlyoutProps {
  definition: ReadStreamDefinition;
  onClose: () => void;
}

type ProcessorType = ProcessingDefinition['config']['type'];

export function AddProcessorFlyout({ definition, onClose }: ProcessorFlyoutProps) {
  const { fields, inheritedFields } = definition;

  const [selectedField, setSelectedField] = useState('');
  const [selectedType, setSelectedType] = useState<ProcessorType>('grok');

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

interface TAvailableProcessor {
  value: ProcessorType;
  inputDisplay: string;
  getDocUrl: (esDocUrl: string) => React.ReactNode;
}

type TAvailableProcessors = Record<ProcessorType, TAvailableProcessor>;

const availableProcessors: TAvailableProcessors = {
  dissect: {
    value: 'dissect',
    inputDisplay: 'Dissect',
    getDocUrl: (esDocUrl: string) => (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.dissectHelpText"
        defaultMessage="Uses {dissectLink} patterns to extract matches from a field."
        values={{
          dissectLink: (
            <EuiLink external target="_blank" href={esDocUrl + 'dissect-processor.html'}>
              dissect
            </EuiLink>
          ),
        }}
      />
    ),
  },
  grok: {
    value: 'grok',
    inputDisplay: 'Grok',
    getDocUrl: (esDocUrl: string) => (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.grokHelpText"
        defaultMessage="Uses {grokLink} expressions to extract matches from a field."
        values={{
          grokLink: (
            <EuiLink external target="_blank" href={esDocUrl + 'grok-processor.html'}>
              grok
            </EuiLink>
          ),
        }}
      />
    ),
  },
};

const getProcessorDescription = (esDocUrl: string) => (type: ProcessorType) =>
  availableProcessors[type].getDocUrl(esDocUrl);

const processorTypeSelectorOptions = Object.values(availableProcessors).map(
  ({ value, inputDisplay }) => ({ value, inputDisplay })
);

interface ProcessorTypeSelectorProps {
  value: ProcessorType;
  onChange: EuiSuperSelectProps<ProcessorType>['onChange'];
}

const ProcessorTypeSelector = ({ value, onChange }: ProcessorTypeSelectorProps) => {
  const { core } = useKibana();
  const esDocUrl = core.docLinks.links.elasticsearch.docsBase;

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.typeSelectorLabel',
        { defaultMessage: 'Processor' }
      )}
      helpText={getProcessorDescription(esDocUrl)(value)}
    >
      <EuiSuperSelect
        options={processorTypeSelectorOptions}
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
