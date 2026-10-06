/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import {
  MAX_CUSTOM_CONTEXT_SNIPPETS,
  MAX_CUSTOM_CONTEXT_SNIPPET_LENGTH,
  type CustomContextSnippet,
} from '@kbn/nightshift-investigations-plugin/common';
import { useFormatTimestamp } from '../common/format_timestamp';
import { useFetchCustomContext } from './use_fetch_custom_context';
import { useSaveCustomContext } from './use_save_custom_context';

const snippetTextCss = css`
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const toInputs = (snippets: readonly CustomContextSnippet[]) =>
  snippets.map(({ id, text }) => ({ id, text }));

function SnippetItem({
  snippet,
  canEdit,
  isSaving,
  onDelete,
}: {
  snippet: CustomContextSnippet;
  canEdit: boolean;
  isSaving: boolean;
  onDelete: () => void;
}): React.ReactElement {
  const formatTimestamp = useFormatTimestamp();
  const deleteLabel = i18n.translate('xpack.nightshift.customContext.deleteAriaLabel', {
    defaultMessage: 'Delete snippet',
  });

  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj="nightshiftCustomContextSnippet">
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s" css={snippetTextCss}>
            <p data-test-subj="nightshiftCustomContextSnippetText">{snippet.text}</p>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <span data-test-subj="nightshiftCustomContextSnippetAuthor">{snippet.author_name}</span>
            {' · '}
            <EuiToolTip content={formatTimestamp(snippet.created_at)}>
              <span tabIndex={0}>
                <FormattedRelative value={snippet.created_at} />
              </span>
            </EuiToolTip>
          </EuiText>
        </EuiFlexItem>
        {canEdit && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={deleteLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                aria-label={deleteLabel}
                disabled={isSaving}
                onClick={onDelete}
                data-test-subj="nightshiftCustomContextDelete"
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function CustomContextSnippets({
  snippets,
  version,
  canEdit,
}: {
  snippets: readonly CustomContextSnippet[];
  version?: string;
  canEdit: boolean;
}): React.ReactElement {
  const [draft, setDraft] = useState<string | undefined>();
  const { mutate: save, isLoading: isSaving } = useSaveCustomContext();

  const onAdd = () => {
    if (!draft?.trim()) return;
    save(
      { snippets: [...toInputs(snippets), { text: draft }], version },
      { onSuccess: () => setDraft(undefined) }
    );
  };

  const onDelete = (id: string) =>
    save({ snippets: toInputs(snippets.filter((snippet) => snippet.id !== id)), version });

  return (
    <>
      {snippets.length === 0 && draft === undefined && (
        <EuiText size="s" data-test-subj="nightshiftCustomContextEmpty">
          <p>
            {i18n.translate('xpack.nightshift.customContext.empty', {
              defaultMessage: 'No custom context is configured in this space.',
            })}
          </p>
        </EuiText>
      )}
      <EuiFlexGroup direction="column" gutterSize="s">
        {snippets.map((snippet) => (
          <EuiFlexItem key={snippet.id}>
            <SnippetItem
              snippet={snippet}
              canEdit={canEdit}
              isSaving={isSaving}
              onDelete={() => onDelete(snippet.id)}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {canEdit && draft === undefined && (
        <EuiButtonEmpty
          iconType="plus"
          size="s"
          disabled={isSaving || snippets.length >= MAX_CUSTOM_CONTEXT_SNIPPETS}
          onClick={() => setDraft('')}
          data-test-subj="nightshiftCustomContextAdd"
        >
          {i18n.translate('xpack.nightshift.customContext.addButton', {
            defaultMessage: 'Add snippet',
          })}
        </EuiButtonEmpty>
      )}
      {canEdit && draft !== undefined && (
        <>
          <EuiTextArea
            fullWidth
            autoFocus
            rows={4}
            value={draft}
            maxLength={MAX_CUSTOM_CONTEXT_SNIPPET_LENGTH}
            disabled={isSaving}
            aria-label={i18n.translate('xpack.nightshift.customContext.snippetAriaLabel', {
              defaultMessage: 'New snippet',
            })}
            placeholder={i18n.translate('xpack.nightshift.customContext.snippetPlaceholder', {
              defaultMessage:
                'For example: While debugging alerts, always rule out a release or config regression first.',
            })}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onAdd();
              }
            }}
            data-test-subj="nightshiftCustomContextDraft"
          />
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                disabled={isSaving}
                onClick={() => setDraft(undefined)}
                data-test-subj="nightshiftCustomContextCancel"
              >
                {i18n.translate('xpack.nightshift.customContext.cancelButton', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                isLoading={isSaving}
                isDisabled={!draft.trim()}
                onClick={onAdd}
                data-test-subj="nightshiftCustomContextSave"
              >
                {i18n.translate('xpack.nightshift.customContext.saveButton', {
                  defaultMessage: 'Save',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
}

export function CustomContextFlyout({
  canEdit,
  onClose,
}: {
  canEdit: boolean;
  onClose: () => void;
}): React.ReactElement {
  const titleId = useGeneratedHtmlId({ prefix: 'nightshiftCustomContextTitle' });
  const { data, error, isLoading } = useFetchCustomContext();

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={titleId}
      size="m"
      ownFocus
      data-test-subj="nightshiftCustomContextFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {i18n.translate('xpack.nightshift.customContext.flyoutTitle', {
              defaultMessage: 'Custom context',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.nightshift.customContext.description', {
              defaultMessage:
                "Custom context provided to Nightshift's reasoning in this space. Each snippet is combined and inserted into the system prompt for investigations and chats with the Nightshift agent.",
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        {isLoading && <EuiLoadingSpinner size="l" />}
        {error && (
          <KbnDangerCallout
            size="s"
            data-test-subj="nightshiftCustomContextLoadError"
            title={i18n.translate('xpack.nightshift.customContext.loadErrorTitle', {
              defaultMessage: 'Failed to load custom context',
            })}
            text={error.message}
          />
        )}
        {data && (
          <CustomContextSnippets
            snippets={data.snippets}
            version={data.version}
            canEdit={canEdit}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="nightshiftCustomContextClose">
              {i18n.translate('xpack.nightshift.customContext.closeButton', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
