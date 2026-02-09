/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiCodeBlock,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UNIT_OPTIONS, type CustomMetric } from '../types';

interface SaveQueryModalProps {
  query: string;
  entity: string;
  /** Optional: existing metric to edit */
  editingMetric?: CustomMetric | null;
  /** Initial unit value */
  initialUnit?: string;
  onSave: (name: string, query: string, entity: string, unit: string) => void;
  onClose: () => void;
}

export const SaveQueryModal: React.FC<SaveQueryModalProps> = ({
  query,
  entity,
  editingMetric,
  initialUnit = '',
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(editingMetric?.name ?? '');
  const [unit, setUnit] = useState(editingMetric?.unit ?? initialUnit);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingMetric;

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(
        i18n.translate('xpack.infra.esqlInventory.saveQueryModal.nameRequired', {
          defaultMessage: 'Please enter a name for the custom metric',
        })
      );
      return;
    }

    if (trimmedName.length < 2) {
      setError(
        i18n.translate('xpack.infra.esqlInventory.saveQueryModal.nameTooShort', {
          defaultMessage: 'Name must be at least 2 characters',
        })
      );
      return;
    }

    onSave(trimmedName, query, entity, unit);
    onClose();
  }, [name, query, entity, unit, onSave, onClose]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError(null);
  }, []);

  const handleUnitChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setUnit(e.target.value);
  }, []);

  const unitOptions = UNIT_OPTIONS.map((opt) => ({
    value: opt.value,
    text: opt.label,
  }));

  return (
    <EuiModal
      onClose={onClose}
      style={{ width: 600 }}
      aria-label={i18n.translate('xpack.infra.esqlInventory.saveQueryModal.ariaLabel', {
        defaultMessage: 'Save custom metric',
      })}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {isEditing
            ? i18n.translate('xpack.infra.esqlInventory.saveQueryModal.editTitle', {
                defaultMessage: 'Edit Custom Metric',
              })
            : i18n.translate('xpack.infra.esqlInventory.saveQueryModal.title', {
                defaultMessage: 'Save Custom Metric',
              })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm component="form">
          <EuiFormRow
            label={i18n.translate('xpack.infra.esqlInventory.saveQueryModal.nameLabel', {
              defaultMessage: 'Metric name',
            })}
            isInvalid={!!error}
            error={error}
          >
            <EuiFieldText
              placeholder={i18n.translate(
                'xpack.infra.esqlInventory.saveQueryModal.namePlaceholder',
                { defaultMessage: 'e.g., CPU Usage Rate' }
              )}
              value={name}
              onChange={handleNameChange}
              isInvalid={!!error}
              data-test-subj="saveQueryModalNameInput"
              autoFocus
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.translate('xpack.infra.esqlInventory.saveQueryModal.unitLabel', {
              defaultMessage: 'Unit',
            })}
            helpText={i18n.translate('xpack.infra.esqlInventory.saveQueryModal.unitHelpText', {
              defaultMessage: 'Select how values should be formatted',
            })}
          >
            <EuiSelect
              options={unitOptions}
              value={unit}
              onChange={handleUnitChange}
              data-test-subj="saveQueryModalUnitSelect"
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.translate('xpack.infra.esqlInventory.saveQueryModal.entityLabel', {
              defaultMessage: 'Associated entity',
            })}
          >
            <EuiText size="s">
              <code>{entity}</code>
            </EuiText>
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.translate('xpack.infra.esqlInventory.saveQueryModal.queryLabel', {
              defaultMessage: 'ES|QL Query',
            })}
          >
            <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
              {query}
            </EuiCodeBlock>
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiCallOut
            size="s"
            color="primary"
            iconType="iInCircle"
            title={i18n.translate('xpack.infra.esqlInventory.saveQueryModal.infoTitle', {
              defaultMessage: 'About custom metrics',
            })}
          >
            <EuiText size="xs">
              {i18n.translate('xpack.infra.esqlInventory.saveQueryModal.infoText', {
                defaultMessage:
                  'This custom metric will be available in the dropdown when the entity "{entity}" is selected. The saved query will be stored in your browser\'s local storage.',
                values: { entity },
              })}
            </EuiText>
          </EuiCallOut>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="saveQueryModalCancelButton">
          {i18n.translate('xpack.infra.esqlInventory.saveQueryModal.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          onClick={handleSave}
          fill
          data-test-subj="saveQueryModalSaveButton"
          isDisabled={!name.trim()}
        >
          {isEditing
            ? i18n.translate('xpack.infra.esqlInventory.saveQueryModal.update', {
                defaultMessage: 'Update',
              })
            : i18n.translate('xpack.infra.esqlInventory.saveQueryModal.save', {
                defaultMessage: 'Save',
              })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
