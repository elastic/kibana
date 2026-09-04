/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiHorizontalRule,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core/public';
import { useEntityMetadata, useSaveEntityMetadata } from '../hooks/use_entity_metadata';

interface MetadataRow {
  key: string;
  value: string;
}

interface Props {
  http: HttpStart;
  definitionId: string;
  entityId: string;
  onClose: () => void;
}

export const EntityMetadataFlyout = ({ http, definitionId, entityId, onClose }: Props) => {
  const { data: savedMetadata, isLoading } = useEntityMetadata(http, definitionId, entityId);
  const saveMutation = useSaveEntityMetadata(http, definitionId, entityId);

  const [rows, setRows] = useState<MetadataRow[]>([{ key: '', value: '' }]);

  // Populate rows once existing metadata loads
  useEffect(() => {
    if (savedMetadata) {
      const existing = Object.entries(savedMetadata).map(([key, value]) => ({ key, value }));
      setRows(existing.length > 0 ? existing : [{ key: '', value: '' }]);
    }
  }, [savedMetadata]);

  const addRow = () => setRows((prev) => [...prev, { key: '', value: '' }]);

  const removeRow = (idx: number) =>
    setRows((prev) =>
      prev.length === 1 ? [{ key: '', value: '' }] : prev.filter((_, i) => i !== idx)
    );

  const updateRow = (idx: number, field: 'key' | 'value', val: string) =>
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row)));

  const handleSave = () => {
    // Only send rows that have a non-empty key
    const valid = rows.filter((r) => r.key.trim().length > 0);
    saveMutation.mutate(
      valid.map(({ key, value }) => ({ key: key.trim(), value })),
      { onSuccess: onClose }
    );
  };

  return (
    <EuiFlyout size="s" onClose={onClose} aria-labelledby="entityMetadataFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="entityMetadataFlyoutTitle">
            {i18n.translate('xpack.entitiesRuntimeCaue.entityMetadata.title', {
              defaultMessage: 'Edit metadata',
            })}
          </h2>
        </EuiTitle>
        <EuiText size="xs" color="subdued" style={{ marginTop: 4 }}>
          <code>{entityId}</code>
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isLoading ? (
          <EuiLoadingSpinner />
        ) : (
          <>
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.entitiesRuntimeCaue.entityMetadata.help', {
                  defaultMessage:
                    'Add any key/value pairs. They are written to the materialised metadata index and returned by the next discovery query.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem>
                <EuiText size="xs">
                  <strong>
                    {i18n.translate('xpack.entitiesRuntimeCaue.entityMetadata.keyCol', {
                      defaultMessage: 'Key',
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  <strong>
                    {i18n.translate('xpack.entitiesRuntimeCaue.entityMetadata.valueCol', {
                      defaultMessage: 'Value',
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ width: 32 }} />
            </EuiFlexGroup>
            <EuiHorizontalRule margin="xs" />

            {rows.map((row, idx) => (
              <EuiFlexGroup key={idx} gutterSize="s" alignItems="center">
                <EuiFlexItem>
                  <EuiFormRow display="rowCompressed">
                    <EuiFieldText
                      compressed
                      placeholder="key"
                      value={row.key}
                      onChange={(e) => updateRow(idx, 'key', e.target.value)}
                      data-test-subj={`entityMetadataKey-${idx}`}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow display="rowCompressed">
                    <EuiFieldText
                      compressed
                      placeholder="value"
                      value={row.value}
                      onChange={(e) => updateRow(idx, 'value', e.target.value)}
                      data-test-subj={`entityMetadataValue-${idx}`}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate('xpack.entitiesRuntimeCaue.entityMetadata.removeRow', {
                      defaultMessage: 'Remove row',
                    })}
                    disableScreenReaderOutput
                  >
                    <EuiButtonIcon
                      iconType="trash"
                      color="danger"
                      aria-label={i18n.translate(
                        'xpack.entitiesRuntimeCaue.entityMetadata.removeRow',
                        { defaultMessage: 'Remove row' }
                      )}
                      onClick={() => removeRow(idx)}
                      data-test-subj={`entityMetadataRemove-${idx}`}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}

            <EuiSpacer size="s" />
            <EuiButtonEmpty
              iconType="plus"
              size="s"
              onClick={addRow}
              data-test-subj="entityMetadataAddRow"
            >
              {i18n.translate('xpack.entitiesRuntimeCaue.entityMetadata.addRow', {
                defaultMessage: 'Add row',
              })}
            </EuiButtonEmpty>
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="entitiesRuntimeCaueEntityMetadataFlyoutCancelButton"
              onClick={onClose}
            >
              {i18n.translate('xpack.entitiesRuntimeCaue.entityMetadata.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSave}
              isLoading={saveMutation.isLoading}
              data-test-subj="entityMetadataSave"
            >
              {i18n.translate('xpack.entitiesRuntimeCaue.entityMetadata.save', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
