/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiMarkdownEditor,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getCortexStatusLabel } from './entity_type_labels';
import { CORTEX_PAGE_STATUSES, type CortexPage, type CortexPageStatus } from './types';
import { useUpdateCortexPage } from './use_cortex';

interface CortexPageEditorProps {
  page: CortexPage;
  onDone: () => void;
}

export function CortexPageEditor({ page, onDone }: CortexPageEditorProps) {
  const [title, setTitle] = useState(page.title);
  const [status, setStatus] = useState(page.status);
  const [description, setDescription] = useState(page.description ?? '');
  const [content, setContent] = useState(page.content);
  const { mutate: updatePage, isLoading } = useUpdateCortexPage();

  const onSave = () =>
    updatePage(
      {
        entity_type: page.entity_type,
        slug: page.slug,
        title: title.trim(),
        description: description.trim(),
        content,
        status,
      },
      { onSuccess: onDone }
    );

  return (
    <EuiForm component="div" fullWidth data-test-subj="nightshiftCortexPageEditor">
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.significantEventsApp.cortex.editor.titleLabel', {
              defaultMessage: 'Title',
            })}
          >
            <EuiFieldText
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-test-subj="nightshiftCortexEditorTitle"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.significantEventsApp.cortex.editor.statusLabel', {
              defaultMessage: 'Status',
            })}
          >
            <EuiSelect
              options={CORTEX_PAGE_STATUSES.map((value) => ({
                value,
                text: getCortexStatusLabel(value),
              }))}
              value={status}
              onChange={(event) => setStatus(event.target.value as CortexPageStatus)}
              data-test-subj="nightshiftCortexEditorStatus"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFormRow
        label={i18n.translate('xpack.significantEventsApp.cortex.editor.descriptionLabel', {
          defaultMessage: 'Summary',
        })}
      >
        <EuiFieldText
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          data-test-subj="nightshiftCortexEditorDescription"
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.significantEventsApp.cortex.editor.contentLabel', {
          defaultMessage: 'Content',
        })}
      >
        <EuiMarkdownEditor
          aria-label={i18n.translate('xpack.significantEventsApp.cortex.editor.contentAriaLabel', {
            defaultMessage: 'Cortex page content',
          })}
          value={content}
          onChange={setContent}
          height={480}
          data-test-subj="nightshiftCortexEditorContent"
        />
      </EuiFormRow>
      <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onDone} data-test-subj="nightshiftCortexEditorCancel">
            <FormattedMessage
              id="xpack.significantEventsApp.cortex.editor.cancelButton"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={onSave}
            isLoading={isLoading}
            isDisabled={title.trim().length === 0}
            data-test-subj="nightshiftCortexEditorSave"
          >
            <FormattedMessage
              id="xpack.significantEventsApp.cortex.editor.saveButton"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
}
