/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { RecursiveRecord, StreamDefinition } from '@kbn/streams-schema';
import { GrokPatternDefinition } from './grok_pattern_definition';
import { GrokPatternsEditor } from './grok_patterns_editor';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { OptionalFieldsAccordion } from '../optional_fields_accordion';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { UseProcessingSimulatorReturn } from '../../hooks/use_processing_simulator';

export const GrokProcessorForm = ({
  definition,
  refreshSimulation,
  samples,
}: {
  definition?: StreamDefinition;
  refreshSimulation?: UseProcessingSimulatorReturn['refreshSimulation'];
  samples?: RecursiveRecord[];
}) => {
  return (
    <>
      <ProcessorFieldSelector />
      <GrokPatternsEditor
        definition={definition}
        refreshSimulation={refreshSimulation}
        samples={samples}
      />
      <EuiSpacer size="m" />
      <EuiSpacer size="m" />
      <OptionalFieldsAccordion>
        <GrokPatternDefinition />
        <EuiSpacer size="m" />
        <ProcessorConditionEditor />
      </OptionalFieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
      <IgnoreMissingToggle />
    </>
  );
};
