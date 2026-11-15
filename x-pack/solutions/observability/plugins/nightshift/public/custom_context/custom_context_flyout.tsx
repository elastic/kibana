/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
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
  useEuiTheme,
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

const NEW_SNIPPET = 'new';

const ACTIONS_CLASS = 'nightshiftCustomContextSnippetActions';

const snippetTextCss = css`
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const toInputs = (snippets: readonly CustomContextSnippet[]) =>
  snippets.map(({ id, text }) => ({ id, text }));

const labels = {
  edit: i18n.translate('xpack.nightshift.customContext.editAriaLabel', {
    defaultMessage: 'Edit snippet',
  }),
  delete: i18n.translate('xpack.nightshift.customContext.deleteAriaLabel', {
    defaultMessage: 'Delete snippet',
  }),
  add: i18n.translate('xpack.nightshift.customContext.addButton', {
    defaultMessage: 'Add snippet',
  }),
  edited: i18n.translate('xpack.nightshift.customContext.edited', {
    defaultMessage: 'Edited',
  }),
};

const DEFAULT_SNIPPET_PLACEHOLDER = i18n.translate(
  'xpack.nightshift.customContext.snippetPlaceholder',
  {
    defaultMessage:
      'For example: While debugging alerts, always rule out a release or config regression first.',
  }
);

function SnippetEditor({
  initialText = '',
  placeholder = DEFAULT_SNIPPET_PLACEHOLDER,
  isSaving,
  onSave,
  onCancel,
}: {
  initialText?: string;
  placeholder?: string;
  isSaving: boolean;
  onSave: (text: string) => void;
  onCancel: () => void;
}): React.ReactElement {
  const [text, setText] = useState(initialText);
  const canSave = text.trim().length > 0 && text.trim() !== initialText.trim();
  const save = () => {
    if (canSave) onSave(text);
  };

  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj="nightshiftCustomContextEditor">
      <EuiTextArea
        fullWidth
        autoFocus
        resize="vertical"
        rows={4}
        value={text}
        maxLength={MAX_CUSTOM_CONTEXT_SNIPPET_LENGTH}
        disabled={isSaving}
        aria-label={i18n.translate('xpack.nightshift.customContext.snippetAriaLabel', {
          defaultMessage: 'Snippet text',
        })}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save();
          } else if (e.key === 'Escape') {
            e.stopPropagation();
            onCancel();
          }
        }}
        data-test-subj="nightshiftCustomContextDraft"
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.nightshift.customContext.editorHint', {
              defaultMessage: '⌘/Ctrl + Enter to save · Esc to cancel',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            disabled={isSaving}
            onClick={onCancel}
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
            isDisabled={!canSave}
            onClick={save}
            data-test-subj="nightshiftCustomContextSave"
          >
            {i18n.translate('xpack.nightshift.customContext.saveButton', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function SnippetMeta({ snippet }: { snippet: CustomContextSnippet }): React.ReactElement {
  const formatTimestamp = useFormatTimestamp();
  const { author_name: authorName, created_at: createdAt, updated_at, updated_by } = snippet;

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiAvatar name={authorName} size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <span data-test-subj="nightshiftCustomContextSnippetAuthor">{authorName}</span>
          {' · '}
          <EuiToolTip content={formatTimestamp(createdAt)}>
            <span tabIndex={0}>
              <FormattedRelative value={createdAt} />
            </span>
          </EuiToolTip>
          {updated_at && (
            <>
              {' · '}
              <EuiToolTip
                content={i18n.translate('xpack.nightshift.customContext.editedTooltip', {
                  defaultMessage: 'Edited by {name} on {timestamp}',
                  values: { name: updated_by, timestamp: formatTimestamp(updated_at) },
                })}
              >
                <span tabIndex={0} data-test-subj="nightshiftCustomContextEdited">
                  {labels.edited}
                </span>
              </EuiToolTip>
            </>
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function SnippetItem({
  snippet,
  canEdit,
  isSaving,
  onEdit,
  onDelete,
}: {
  snippet: CustomContextSnippet;
  canEdit: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onDelete: () => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const revealActionsCss = css`
    .${ACTIONS_CLASS} {
      opacity: 0;
      transition: opacity ${euiTheme.animation.fast} ease-in;
    }
    &:hover .${ACTIONS_CLASS}, &:focus-within .${ACTIONS_CLASS} {
      opacity: 1;
    }
  `;

  return (
    <EuiPanel
      color="subdued"
      paddingSize="m"
      css={revealActionsCss}
      data-test-subj="nightshiftCustomContextSnippet"
    >
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s" css={snippetTextCss}>
            <p data-test-subj="nightshiftCustomContextSnippetText">{snippet.text}</p>
          </EuiText>
        </EuiFlexItem>
        {canEdit && (
          <EuiFlexItem grow={false} className={ACTIONS_CLASS}>
            <EuiFlexGroup gutterSize="none" responsive={false}>
              <EuiToolTip content={labels.edit} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="pencil"
                  color="text"
                  aria-label={labels.edit}
                  disabled={isSaving}
                  onClick={onEdit}
                  data-test-subj="nightshiftCustomContextEdit"
                />
              </EuiToolTip>
              <EuiToolTip content={labels.delete} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  aria-label={labels.delete}
                  disabled={isSaving}
                  onClick={onDelete}
                  data-test-subj="nightshiftCustomContextDelete"
                />
              </EuiToolTip>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <SnippetMeta snippet={snippet} />
    </EuiPanel>
  );
}

/** Lists, adds, edits and deletes the space's custom context snippets. */
export function CustomContextSnippets({
  snippets,
  version,
  canEdit,
  addLabel = labels.add,
  placeholder,
  showEmptyPrompt = true,
}: {
  snippets: readonly CustomContextSnippet[];
  version?: string;
  canEdit: boolean;
  addLabel?: string;
  placeholder?: string;
  /** Without it, an empty list only shows the add button. */
  showEmptyPrompt?: boolean;
}): React.ReactElement {
  // Either the id of the snippet being edited, NEW_SNIPPET while adding one, or undefined.
  const [editing, setEditing] = useState<string | undefined>();
  const { mutate: save, isLoading: isSaving } = useSaveCustomContext();
  const stopEditing = () => setEditing(undefined);
  const canAdd = canEdit && snippets.length < MAX_CUSTOM_CONTEXT_SNIPPETS;

  const onAdd = (text: string) =>
    save({ snippets: [...toInputs(snippets), { text }], version }, { onSuccess: stopEditing });

  const onUpdate = (id: string, text: string) =>
    save(
      {
        snippets: toInputs(snippets).map((snippet) =>
          snippet.id === id ? { ...snippet, text } : snippet
        ),
        version,
      },
      { onSuccess: stopEditing }
    );

  const onDelete = (id: string) =>
    save({ snippets: toInputs(snippets.filter((snippet) => snippet.id !== id)), version });

  if (showEmptyPrompt && snippets.length === 0 && editing !== NEW_SNIPPET) {
    return (
      <EuiEmptyPrompt
        iconType="documentation"
        titleSize="xs"
        paddingSize="l"
        title={
          <h3>
            {i18n.translate('xpack.nightshift.customContext.emptyTitle', {
              defaultMessage: 'No custom context yet',
            })}
          </h3>
        }
        body={
          <p>
            {i18n.translate('xpack.nightshift.customContext.emptyBody', {
              defaultMessage:
                'Share investigation conventions, service ownership, or known quirks of your environment. Nightshift takes them into account in every investigation and chat in this space.',
            })}
          </p>
        }
        actions={
          canAdd ? (
            <EuiButton
              size="s"
              iconType="plus"
              onClick={() => setEditing(NEW_SNIPPET)}
              data-test-subj="nightshiftCustomContextAdd"
            >
              {labels.add}
            </EuiButton>
          ) : undefined
        }
        data-test-subj="nightshiftCustomContextEmpty"
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {snippets.map((snippet) => (
        <EuiFlexItem key={snippet.id}>
          {editing === snippet.id ? (
            <SnippetEditor
              initialText={snippet.text}
              placeholder={placeholder}
              isSaving={isSaving}
              onSave={(text) => onUpdate(snippet.id, text)}
              onCancel={stopEditing}
            />
          ) : (
            <SnippetItem
              snippet={snippet}
              canEdit={canEdit}
              isSaving={isSaving}
              onEdit={() => setEditing(snippet.id)}
              onDelete={() => onDelete(snippet.id)}
            />
          )}
        </EuiFlexItem>
      ))}
      {editing === NEW_SNIPPET && (
        <EuiFlexItem>
          <SnippetEditor
            placeholder={placeholder}
            isSaving={isSaving}
            onSave={onAdd}
            onCancel={stopEditing}
          />
        </EuiFlexItem>
      )}
      {canAdd && editing !== NEW_SNIPPET && (
        <EuiFlexItem grow={false}>
          <EuiSpacer size="xs" />
          <div>
            <EuiButtonEmpty
              iconType="plus"
              size="s"
              flush="left"
              disabled={isSaving}
              onClick={() => setEditing(NEW_SNIPPET)}
              data-test-subj="nightshiftCustomContextAdd"
            >
              {addLabel}
            </EuiButtonEmpty>
          </div>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
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
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.nightshift.customContext.description', {
              defaultMessage:
                'Notes that Nightshift adds to its system prompt for every investigation and chat in this space.',
            })}
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
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
