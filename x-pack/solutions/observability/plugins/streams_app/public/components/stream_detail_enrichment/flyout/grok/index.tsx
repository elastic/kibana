/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ReadStreamDefinition } from '@kbn/streams-schema';
import { GrokPatternDefinition } from './grok_pattern_definition';
import { GrokPatternsEditor } from './grok_patterns_editor';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { ToggleField } from '../toggle_field';
import { OptionalFieldsAccordion } from '../optional_fields_accordion';
import { getFieldsMapFromDefinition } from '../../utils';
import { ProcessorConditionEditor } from '../processor_condition_editor';

interface GrokProcessorFormProps {
  definition: ReadStreamDefinition;
}

export const GrokProcessorForm = ({ definition }: GrokProcessorFormProps) => {
  const mappedFields = useMemo(() => getFieldsMapFromDefinition(definition), [definition]);

  return (
    <>
      <ProcessorFieldSelector fields={mappedFields} />
      <GrokPatternsEditor />
      <EuiSpacer size="m" />
      <OptionalFieldsAccordion>
        <GrokPatternDefinition />
        <EuiSpacer size="m" />
        <ProcessorConditionEditor />
      </OptionalFieldsAccordion>
      <EuiSpacer size="m" />
      <ToggleField
        name="ignore_failure"
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.ignoreFailuresLabel',
          { defaultMessage: 'Ignore failures for this processor' }
        )}
      />
    </>
  );
};
