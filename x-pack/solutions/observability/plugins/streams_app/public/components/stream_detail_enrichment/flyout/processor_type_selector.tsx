/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiSuperSelectProps, EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ProcessorType } from '../types';
import { useKibana } from '../../../hooks/use_kibana';

interface TAvailableProcessor {
  value: ProcessorType;
  inputDisplay: string;
  getDocUrl: (esDocUrl: string) => React.ReactNode;
}

type TAvailableProcessors = Record<ProcessorType, TAvailableProcessor>;

interface ProcessorTypeSelectorProps {
  value: ProcessorType;
  onChange: EuiSuperSelectProps<ProcessorType>['onChange'];
}

export const ProcessorTypeSelector = ({ value, onChange }: ProcessorTypeSelectorProps) => {
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
