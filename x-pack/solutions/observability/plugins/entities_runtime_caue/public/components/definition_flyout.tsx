/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core/public';
import type { EntityDefinitionAttributes } from '../../common/entity_definition';
import { useCreateDefinition } from '../hooks/use_definitions';

interface Props {
  http: HttpStart;
  onClose: () => void;
}

export const DefinitionFlyout = ({ http, onClose }: Props) => {
  const createMutation = useCreateDefinition(http);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [identityFields, setIdentityFields] = useState<Array<{ label: string }>>([]);
  const [indexPattern, setIndexPattern] = useState('');
  const [lookbackPeriod, setLookbackPeriod] = useState('30d');

  const [submitted, setSubmitted] = useState(false);

  const isNameInvalid = submitted && name.trim().length === 0;
  const isTypeInvalid = submitted && type.trim().length === 0;
  const isFieldsInvalid = submitted && identityFields.length === 0;
  const isPatternInvalid = submitted && indexPattern.trim().length === 0;

  const handleSave = () => {
    setSubmitted(true);
    if (!name.trim() || !type.trim() || identityFields.length === 0 || !indexPattern.trim()) {
      return;
    }
    const attrs: EntityDefinitionAttributes = {
      name: name.trim(),
      type: type.trim(),
      identityFields: identityFields.map((f) => f.label),
      indexPattern: indexPattern.trim(),
      lookbackPeriod: lookbackPeriod.trim() || '30d',
    };
    createMutation.mutate(attrs, { onSuccess: onClose });
  };

  return (
    <EuiFlyout size="s" onClose={onClose} aria-labelledby="definitionFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="definitionFlyoutTitle">
            {i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.title', {
              defaultMessage: 'Create entity definition',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm>
          <EuiFormRow
            label={i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.nameLabel', {
              defaultMessage: 'Name',
            })}
            isInvalid={isNameInvalid}
            error={
              isNameInvalid
                ? i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.nameRequired', {
                    defaultMessage: 'Name is required',
                  })
                : undefined
            }
          >
            <EuiFieldText
              data-test-subj="entitiesRuntimeDefinitionName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              isInvalid={isNameInvalid}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.typeLabel', {
              defaultMessage: 'Entity type',
            })}
            helpText={i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.typeHelp', {
              defaultMessage: 'Short name, e.g. "service", "host". Prefixed onto entity.id.',
            })}
            isInvalid={isTypeInvalid}
            error={
              isTypeInvalid
                ? i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.typeRequired', {
                    defaultMessage: 'Entity type is required',
                  })
                : undefined
            }
          >
            <EuiFieldText
              data-test-subj="entitiesRuntimeDefinitionType"
              value={type}
              onChange={(e) => setType(e.target.value)}
              isInvalid={isTypeInvalid}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.fieldsLabel', {
              defaultMessage: 'Identity fields',
            })}
            helpText={i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.fieldsHelp', {
              defaultMessage: 'Type a field name and press Enter. Order matters.',
            })}
            isInvalid={isFieldsInvalid}
            error={
              isFieldsInvalid
                ? i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.fieldsRequired', {
                    defaultMessage: 'At least one identity field is required',
                  })
                : undefined
            }
          >
            <EuiComboBox
              data-test-subj="entitiesRuntimeDefinitionIdentityFields"
              placeholder={i18n.translate(
                'xpack.entitiesRuntimeCaue.definitionFlyout.fieldsPlaceholder',
                { defaultMessage: 'Type and press Enter' }
              )}
              selectedOptions={identityFields}
              onCreateOption={(value) => setIdentityFields((prev) => [...prev, { label: value }])}
              onChange={(opts) => setIdentityFields(opts)}
              noSuggestions
              isInvalid={isFieldsInvalid}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.patternLabel', {
              defaultMessage: 'Index pattern',
            })}
            helpText={i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.patternHelp', {
              defaultMessage: 'Spaces and the characters \\ / ? " < > | are not allowed.',
            })}
            isInvalid={isPatternInvalid}
            error={
              isPatternInvalid
                ? i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.patternRequired', {
                    defaultMessage: 'Index pattern is required',
                  })
                : undefined
            }
          >
            <EuiFieldText
              data-test-subj="entitiesRuntimeDefinitionIndexPattern"
              value={indexPattern}
              onChange={(e) => setIndexPattern(e.target.value)}
              isInvalid={isPatternInvalid}
              placeholder="traces-apm*"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.lookbackLabel', {
              defaultMessage: 'Lookback period for first_seen',
            })}
            helpText={i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.lookbackHelp', {
              defaultMessage: 'How far back to search for the first occurrence. E.g. 30d, 7d, 1h.',
            })}
          >
            <EuiFieldText
              data-test-subj="entitiesRuntimeDefinitionLookback"
              value={lookbackPeriod}
              onChange={(e) => setLookbackPeriod(e.target.value)}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="DefinitionFlyoutCancelButton" onClick={onClose}>
              {i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="entitiesRuntimeDefinitionSave"
              fill
              onClick={handleSave}
              isLoading={createMutation.isLoading}
            >
              {i18n.translate('xpack.entitiesRuntimeCaue.definitionFlyout.save', {
                defaultMessage: 'Save definition',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
