/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButton,
  EuiModalFooter,
  EuiSpacer,
  EuiModalHeaderTitle,
  EuiModalHeader,
  EuiModalBody,
  EuiModal,
  EuiFormRow,
  EuiFieldText,
  EuiSelect,
  EuiCallOut,
  useGeneratedHtmlId,
  EuiText,
  EuiCode,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { useUserLimitStatus } from '../../../hooks/use_privileged_monitoring_health';

enum IndexMode {
  STANDARD = 'standard',
  LOOKUP = 'lookup',
}

const INDEX_NAME_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.createIndex.indexNameLabel',
  {
    defaultMessage: 'Index name',
  }
);

const INDEX_MODE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.createIndex.indexModeLabel',
  {
    defaultMessage: 'Index mode',
  }
);

const INDEX_MODES = [
  {
    value: IndexMode.STANDARD,
    text: i18n.translate(
      'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.createIndex.mode.standard',
      { defaultMessage: 'Standard' }
    ),
  },
  {
    value: IndexMode.LOOKUP,
    text: i18n.translate(
      'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.createIndex.mode.lookup',
      { defaultMessage: 'Lookup' }
    ),
  },
];

export const CreateIndexModal = ({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (indexName: string) => void;
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const [indexName, setIndexName] = useState('');
  const [indexMode, setIndexMode] = useState<IndexMode>(IndexMode.STANDARD);
  const [error, setError] = useState<string | null>(null);
  const { createPrivMonImportIndex } = useEntityAnalyticsRoutes();
  const { userStats } = useUserLimitStatus();
  const maxUsersAllowed = userStats?.maxAllowed ?? 10000; // fallback to default config value

  const handleCreate = useCallback(async () => {
    setError(null);
    const trimmedName = indexName.trim();

    try {
      await createPrivMonImportIndex({
        name: trimmedName,
        mode: indexMode,
      });
      onCreate(trimmedName);
    } catch (err) {
      setError(
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.createIndex.error',
          {
            defaultMessage: 'Error creating index: {error}',
            values: { error: err.body.message || err.message || 'Unknown error' },
          }
        )
      );
    }
  }, [indexName, createPrivMonImportIndex, indexMode, onCreate]);

  return (
    <EuiModal onClose={onClose} maxWidth="624px" aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.createIndex.title"
            defaultMessage="Create index"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {error && (
          <>
            <EuiCallOut announceOnMount color="danger">
              {error}
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.createIndex.description"
              defaultMessage="Create an index to store your privileged users (maximum number allowed: {maxUsersAllowed}). After creating it, make sure to index documents with the {nameField} field using your preferred method."
              values={{
                nameField: <EuiCode>{'user.name'}</EuiCode>,
                maxUsersAllowed: <EuiCode>{maxUsersAllowed}</EuiCode>,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow
          label={INDEX_NAME_LABEL}
          fullWidth
          error={!!error && !indexName.trim() ? error : undefined}
        >
          <EuiFieldText
            fullWidth
            value={indexName}
            onChange={(e) => setIndexName(e.target.value)}
            aria-label={INDEX_NAME_LABEL}
            data-test-subj="createIndexModalIndexName"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow label={INDEX_MODE_LABEL} fullWidth>
          <EuiSelect
            options={INDEX_MODES}
            value={indexMode}
            onChange={(e) => setIndexMode(e.target.value as IndexMode)}
            aria-label={INDEX_MODE_LABEL}
            data-test-subj="createIndexModalIndexMode"
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiButtonEmpty
                onClick={onClose}
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.createIndex.cancelButtonAriaLabel',
                  { defaultMessage: 'Cancel' }
                )}
              >
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.createIndex.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
              <EuiButton
                onClick={handleCreate}
                fill
                disabled={!indexName.trim()}
                data-test-subj="createIndexModalCreateButton"
              >
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.createIndex.createButtonLabel"
                  defaultMessage="Create index"
                />
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
