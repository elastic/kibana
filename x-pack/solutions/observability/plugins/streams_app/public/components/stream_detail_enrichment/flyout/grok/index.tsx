/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GrokPatternDefinition } from './grok_pattern_definition';
import { GrokPatternsEditor } from './grok_patterns_editor';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { ToggleField } from '../toggle_field';
import { OptionalFieldsAccordion } from '../optional_fields_accordion';
import { ProcessorConditionEditor } from '../processor_condition_editor';

export const GrokProcessorForm = () => {
  return (
    <>
      <ProcessorFieldSelector />
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
      <ToggleField
        name="ignore_missing"
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.ignoreMissingLabel',
          { defaultMessage: 'Ignore missing' }
        )}
        helpText={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.ignoreMissingHelpText',
          { defaultMessage: 'Ignore documents with a missing field.' }
        )}
      />
    </>
  );
};
