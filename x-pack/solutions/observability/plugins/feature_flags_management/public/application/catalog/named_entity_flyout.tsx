/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ENTITY_KEY_PATTERN, LIMITS } from '../../../common';
import { ApiErrorCallout } from '../api_error_callout';
import { isVersionConflict, toFeatureFlagsApiError, type FeatureFlagsApiError } from '../api_error';
import { cancelButtonLabel, saveButtonLabel } from '../labels';

export interface NamedEntity {
  key: string;
  name: string;
  description?: string;
  version: string;
}

export const NamedEntityFlyout = ({
  entity,
  titleId,
  title,
  keyHelp,
  onClose,
  onReload,
  onSave,
}: {
  entity?: NamedEntity;
  titleId: string;
  title: string;
  keyHelp: string;
  onClose: () => void;
  onReload?: () => void;
  onSave: (input: {
    key: string;
    name: string;
    description?: string;
    version?: string;
  }) => Promise<void>;
}) => {
  const [key, setKey] = useState(entity?.key ?? '');
  const [name, setName] = useState(entity?.name ?? '');
  const [description, setDescription] = useState(entity?.description ?? '');
  const [error, setError] = useState<FeatureFlagsApiError>();
  const [keyInvalid, setKeyInvalid] = useState(false);
  const [nameInvalid, setNameInvalid] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!entity) {
      return;
    }
    setKey(entity.key);
    setName(entity.name);
    setDescription(entity.description ?? '');
    setError(undefined);
  }, [entity]);

  const save = async () => {
    const trimmedKey = key.trim();
    const trimmedName = name.trim();
    if (!entity && !ENTITY_KEY_PATTERN.test(trimmedKey)) {
      setKeyInvalid(true);
      return;
    }
    if (!trimmedName) {
      setNameInvalid(true);
      return;
    }
    setKeyInvalid(false);
    setNameInvalid(false);
    setSaving(true);
    setError(undefined);
    try {
      await onSave({
        key: entity?.key ?? trimmedKey,
        name: trimmedName,
        description: description.trim() || undefined,
        version: entity?.version,
      });
    } catch (caught) {
      setError(toFeatureFlagsApiError(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={titleId} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {error && (
          <ApiErrorCallout
            error={error}
            onReload={isVersionConflict(error) ? onReload : undefined}
          />
        )}
        {!entity && (
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.featureFlagsManagement.catalog.keyLabel"
                defaultMessage="Key"
              />
            }
            helpText={keyHelp}
            isInvalid={keyInvalid}
            error={
              keyInvalid
                ? i18n.translate('xpack.featureFlagsManagement.catalog.keyErrorMessage', {
                    defaultMessage:
                      'Use a lowercase key that starts with a letter or digit and contains only letters, digits, underscores and hyphens.',
                  })
                : undefined
            }
          >
            <EuiFieldText
              data-test-subj="featureFlagsManagementNamedEntityFlyoutFieldText"
              fullWidth
              isInvalid={keyInvalid}
              value={key}
              maxLength={LIMITS.entityKeyMaxLength}
              onChange={(event) => setKey(event.target.value)}
            />
          </EuiFormRow>
        )}
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.featureFlagsManagement.catalog.nameLabel"
              defaultMessage="Name"
            />
          }
          isInvalid={nameInvalid}
          error={
            nameInvalid
              ? i18n.translate('xpack.featureFlagsManagement.catalog.nameErrorMessage', {
                  defaultMessage: 'Enter a name.',
                })
              : undefined
          }
        >
          <EuiFieldText
            data-test-subj="featureFlagsManagementNamedEntityFlyoutFieldText"
            fullWidth
            isInvalid={nameInvalid}
            value={name}
            maxLength={LIMITS.nameMaxLength}
            onChange={(event) => setName(event.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.featureFlagsManagement.catalog.descriptionLabel"
              defaultMessage="Description"
            />
          }
        >
          <EuiTextArea
            data-test-subj="featureFlagsManagementNamedEntityFlyoutTextArea"
            fullWidth
            value={description}
            maxLength={LIMITS.descriptionMaxLength}
            onChange={(event) => setDescription(event.target.value)}
          />
        </EuiFormRow>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-ebt-action="cancel"
              data-ebt-element="featureFlagsManagement"
              data-test-subj="featureFlagsManagementNamedEntityFlyoutButton"
              onClick={onClose}
            >
              {cancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-ebt-action="saveFlag"
              data-ebt-element="featureFlagsManagement"
              data-test-subj="featureFlagsManagementNamedEntityFlyoutButton"
              fill
              isLoading={saving}
              onClick={() => void save()}
            >
              {saveButtonLabel()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
