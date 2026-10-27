/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ValueType, VariationValue } from '../../../common';
import { RuleComposer } from './rule_composer/rule_composer';
import type { EnvironmentDraft } from './flag_form';
import { PrerequisiteEditor } from './prerequisite_editor';
import { VariationFormRow } from './variation_fields';

export const EnvironmentRulesEditor = ({
  environment,
  name,
  ruleSet,
  variations,
  valueType,
  apps,
  currentFlagKey,
  readOnly,
  initiallyOpen,
  onChange,
  onJsonBlockingChange,
}: {
  environment: string;
  name: string;
  ruleSet: EnvironmentDraft;
  variations: readonly VariationValue[];
  valueType: ValueType;
  apps: readonly string[];
  currentFlagKey: string;
  readOnly: boolean;
  initiallyOpen: boolean;
  onChange: (ruleSet: EnvironmentDraft) => void;
  onJsonBlockingChange: (blocking: boolean) => void;
}) => (
  <EuiAccordion
    id={`feature-flags-environment-${environment}`}
    buttonContent={name}
    initialIsOpen={initiallyOpen}
    paddingSize="m"
  >
    <VariationFormRow
      label={
        <FormattedMessage
          id="xpack.featureFlagsManagement.flags.editor.defaultVariationLabel"
          defaultMessage="Default variation"
        />
      }
      variations={variations}
      value={ruleSet.defaultVariation}
      disabled={readOnly}
      onChange={(defaultVariation) => onChange({ ...ruleSet, defaultVariation })}
    />
    <EuiSpacer size="m" />
    <PrerequisiteEditor
      environment={environment}
      currentFlagKey={currentFlagKey}
      prerequisites={ruleSet.prerequisites}
      readOnly={readOnly}
      onChange={(prerequisites) => onChange({ ...ruleSet, prerequisites })}
    />
    <EuiSpacer size="l" />
    <RuleComposer
      rules={ruleSet.rules}
      variations={variations}
      valueType={valueType}
      apps={apps}
      environment={environment}
      readOnly={readOnly}
      onChange={(rules) => onChange({ ...ruleSet, rules })}
      onJsonBlockingChange={onJsonBlockingChange}
    />
  </EuiAccordion>
);
