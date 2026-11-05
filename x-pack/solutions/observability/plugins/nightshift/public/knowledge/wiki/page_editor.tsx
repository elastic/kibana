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
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getWikiStatusLabel } from './entity_type_labels';
import { WIKI_PAGE_STATUSES, type WikiPage, type WikiPageStatus } from './types';
import { useUpdateWikiPage } from './use_wiki';

interface WikiPageEditorProps {
  page: WikiPage;
  /** Version the edit starts from; a save fails if the page has changed since. */
  version: string;
  onDone: () => void;
}

export function WikiPageEditor({ page, version, onDone }: WikiPageEditorProps) {
  const [title, setTitle] = useState(page.title);
  const [status, setStatus] = useState(page.status);
  const [description, setDescription] = useState(page.description ?? '');
  const [content, setContent] = useState(page.content);
  // Pinned so a background refetch can't turn a stale draft into a blind overwrite.
  const [baseVersion] = useState(version);
  const { mutate: updatePage, isLoading } = useUpdateWikiPage();

  const onSave = () =>
    updatePage(
      {
        entity_type: page.entity_type,
        slug: page.slug,
        title: title.trim(),
        description: description.trim(),
        content,
        status,
        version: baseVersion,
      },
      { onSuccess: onDone }
    );

  return (
    <EuiForm component="div" fullWidth data-test-subj="nightshiftWikiPageEditor">
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.nightshift.knowledge.wiki.editor.titleLabel', {
              defaultMessage: 'Title',
            })}
          >
            <EuiFieldText
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-test-subj="nightshiftWikiEditorTitle"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.nightshift.knowledge.wiki.editor.statusLabel', {
              defaultMessage: 'Status',
            })}
          >
            <EuiSelect
              options={WIKI_PAGE_STATUSES.map((value) => ({
                value,
                text: getWikiStatusLabel(value),
              }))}
              value={status}
              onChange={(event) => setStatus(event.target.value as WikiPageStatus)}
              data-test-subj="nightshiftWikiEditorStatus"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFormRow
        label={i18n.translate('xpack.nightshift.knowledge.wiki.editor.descriptionLabel', {
          defaultMessage: 'Summary',
        })}
      >
        <EuiFieldText
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          data-test-subj="nightshiftWikiEditorDescription"
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.nightshift.knowledge.wiki.editor.contentLabel', {
          defaultMessage: 'Content',
        })}
      >
        <EuiMarkdownEditor
          aria-label={i18n.translate('xpack.nightshift.knowledge.wiki.editor.contentAriaLabel', {
            defaultMessage: 'Wiki page content',
          })}
          value={content}
          onChange={setContent}
          height={480}
          data-test-subj="nightshiftWikiEditorContent"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onDone} data-test-subj="nightshiftWikiEditorCancel">
            <FormattedMessage
              id="xpack.nightshift.knowledge.wiki.editor.cancelButton"
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
            data-test-subj="nightshiftWikiEditorSave"
          >
            <FormattedMessage
              id="xpack.nightshift.knowledge.wiki.editor.saveButton"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
}
