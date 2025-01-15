/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { FieldParent } from '../field_parent';
import { FieldStatus } from '../field_status';
import { FieldFormFormat, typeSupportsFormat } from './field_form_format';
import { FieldFormType } from './field_form_type';
import { SchemaEditorFlyoutProps } from '.';
import { FieldType } from '../field_type';

const EMPTY_CONTENT = '-----';

const title = i18n.translate('xpack.streams.streamDetailSchemaEditorFieldSummaryTitle', {
  defaultMessage: 'Field summary',
});

const FIELD_SUMMARIES = {
  fieldStatus: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldSummaryFieldNameHeader', {
      defaultMessage: 'Status',
    }),
  },
  fieldType: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldSummaryFieldTypeHeader', {
      defaultMessage: 'Type',
    }),
  },
  fieldFormat: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldSummaryFieldFormatHeader', {
      defaultMessage: 'Format',
    }),
  },
  fieldParent: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldSummaryFieldParentHeader', {
      defaultMessage: 'Field Parent',
    }),
  },
};

export const FieldSummary = (props: SchemaEditorFlyoutProps) => {
  const {
    selectedField,
    isEditing,
    nextFieldType,
    setNextFieldType,
    nextFieldFormat,
    setNextFieldFormat,
    toggleIsEditing,
  } = props;

  const router = useStreamsAppRouter();

  if (!selectedField) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={1}>
          <EuiTitle size="xxs">
            <span>{title} </span>
          </EuiTitle>
        </EuiFlexItem>
        {selectedField.status !== 'inherited' && !isEditing ? (
          <EuiFlexItem grow={2}>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="streamsAppFieldSummaryEditButton"
                  size="s"
                  color="primary"
                  onClick={() => toggleIsEditing()}
                  iconType="pencil"
                >
                  {i18n.translate('xpack.streams.fieldSummary.editButtonLabel', {
                    defaultMessage: 'Edit',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : selectedField.status === 'inherited' ? (
          <EuiFlexItem grow={2}>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="streamsAppFieldSummaryOpenInParentButton"
                  size="s"
                  color="primary"
                  iconType="popout"
                  href={router.link('/{key}/{tab}/{subtab}', {
                    path: {
                      key: selectedField.parent,
                      tab: 'management',
                      subtab: 'schemaEditor',
                    },
                  })}
                >
                  {i18n.translate('xpack.streams.fieldSummary.editInParentButtonLabel', {
                    defaultMessage: 'Edit in parent stream',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiTitle size="xxs">
            <span>
              {FIELD_SUMMARIES.fieldStatus.label}{' '}
              <EuiIconTip
                type="iInCircle"
                color="subdued"
                content={i18n.translate('xpack.streams.fieldSummary.statusTooltip', {
                  defaultMessage:
                    'Indicates whether the field is actively mapped for use in the configuration or remains unmapped and inactive.',
                })}
              />
            </span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <FieldStatus status={selectedField.status} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="xs" />

      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiTitle size="xxs">
            <span>{FIELD_SUMMARIES.fieldType.label}</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          {isEditing ? (
            <FieldFormType nextFieldType={nextFieldType} setNextFieldType={setNextFieldType} />
          ) : selectedField.type ? (
            <FieldType type={selectedField.type} />
          ) : (
            `${EMPTY_CONTENT}`
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="xs" />

      {typeSupportsFormat(nextFieldType) && (
        <>
          <EuiFlexGroup>
            <EuiFlexItem grow={1}>
              <EuiTitle size="xxs">
                <span>{FIELD_SUMMARIES.fieldFormat.label}</span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              {isEditing ? (
                <FieldFormFormat
                  nextFieldFormat={nextFieldFormat}
                  setNextFieldFormat={setNextFieldFormat}
                  nextFieldType={nextFieldType}
                />
              ) : (
                `${selectedField.format ?? EMPTY_CONTENT}`
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="xs" />
        </>
      )}

      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiTitle size="xxs">
            <span>{FIELD_SUMMARIES.fieldParent.label}</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <FieldParent parent={selectedField.parent} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="xs" />
    </EuiFlexGroup>
  );
};
