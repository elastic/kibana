/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useKibana } from '../../../../hooks/use_kibana';
import { MemoryLineage } from './lineage';
import { MemorySourceTaskLink } from './source_task_link';
import { MemoryTelemetryPanel } from './telemetry_panel';
import { useDeleteMemoryPage, useMemoryPage, useSetMemoryArchived } from './use_memory';
import { contentWithoutDuplicateTitle, pageMarkdownCss } from '../shared/page_markdown';

interface MemoryPageViewProps {
  pageId: string;
  onSelectPage: (id: string) => void;
  onDeleted: () => void;
}

export function MemoryPageView({ pageId, onSelectPage, onDeleted }: MemoryPageViewProps) {
  const {
    core: {
      application: {
        capabilities: { nightshift },
      },
    },
  } = useKibana();
  // Mirrors the privilege tiers the routes enforce: archiving needs the
  // Nightshift manage privilege and deleting additionally needs configure. Read
  // users see the page but not the actions, rather than clicking into a 403.
  const { canManage, canConfigure } = getNightshiftCapabilities(nightshift);

  const { data, isLoading, isError } = useMemoryPage(pageId);
  // Failures are toasted by the hooks, the way every other Nightshift write is,
  // rather than by a banner this view would have to keep in step with its buttons.
  const { mutate: setArchived, isLoading: isArchiving } = useSetMemoryArchived();
  const { mutate: deletePage, isLoading: isDeleting } = useDeleteMemoryPage();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const modalTitleId = useGeneratedHtmlId({ prefix: 'memoryDeleteTitle' });

  const page = data?.page;

  if (isLoading) {
    return <EuiLoadingSpinner size="l" data-test-subj="nightshiftMemoryPageLoading" />;
  }

  if (isError || !page) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        title={
          <h2>
            <FormattedMessage
              id="xpack.significantEventsApp.memory.pageNotFoundTitle"
              defaultMessage="Memory not found"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.significantEventsApp.memory.pageNotFoundDescription"
              defaultMessage="This memory could not be loaded."
            />
          </p>
        }
      />
    );
  }

  return (
    <div data-test-subj="nightshiftMemoryPageView">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2 data-test-subj="nightshiftMemoryPageTitle">{page.title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        {canManage && (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                <FormattedMessage
                  id="xpack.significantEventsApp.memory.archiveTooltip"
                  defaultMessage="Archived memories are excluded from recall."
                />
              }
            >
              {/* No confirmation here, unlike delete below. Archiving only hides
                  a memory from recall and this same button restores it, so a
                  dialog would add a step to a reversible action. Delete is
                  permanent and asks the operator to type the title. */}
              <EuiButton
                size="s"
                iconType={page.archived ? 'refresh' : 'archive'}
                isLoading={isArchiving}
                onClick={() => setArchived({ id: page.id, archived: !page.archived })}
                data-test-subj="nightshiftMemoryArchiveToggle"
              >
                {page.archived ? (
                  <FormattedMessage
                    id="xpack.significantEventsApp.memory.unarchiveButton"
                    defaultMessage="Restore"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.significantEventsApp.memory.archiveButton"
                    defaultMessage="Archive"
                  />
                )}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        )}
        {canConfigure && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              color="danger"
              iconType="trash"
              isDisabled={isDeleting}
              onClick={() => setConfirmingDelete(true)}
              data-test-subj="nightshiftMemoryDeleteButton"
            >
              <FormattedMessage
                id="xpack.significantEventsApp.memory.deleteButton"
                defaultMessage="Delete"
              />
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <MemoryTelemetryPanel page={page} usefulness={data.usefulness} confidence={data.confidence} />

      <EuiSpacer size="xs" />
      <MemorySourceTaskLink page={page} />

      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.significantEventsApp.memory.pageUpdated"
          defaultMessage="Updated {when}"
          values={{ when: <FormattedRelative value={page.updated_at} /> }}
        />
      </EuiText>

      {page.context !== undefined && page.context.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.significantEventsApp.memory.contextHeading"
              defaultMessage="Task this memory was learned from"
            />
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiPanel paddingSize="s" data-test-subj="nightshiftMemoryContext">
            <EuiText size="s">{page.context}</EuiText>
          </EuiPanel>
        </>
      )}

      <EuiSpacer size="m" />
      <MemoryLineage page={page} onSelectPage={onSelectPage} />

      <EuiSpacer size="s" />
      {page.content.length > 0 ? (
        <div className={pageMarkdownCss}>
          <EuiMarkdownFormat textSize="s">
            {contentWithoutDuplicateTitle(page.title, page.content)}
          </EuiMarkdownFormat>
        </div>
      ) : (
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.significantEventsApp.memory.pageEmptyContent"
            defaultMessage="This memory has no content yet."
          />
        </EuiText>
      )}

      {confirmingDelete && (
        <EuiConfirmModal
          titleProps={{ id: modalTitleId }}
          aria-labelledby={modalTitleId}
          title={
            <FormattedMessage
              id="xpack.significantEventsApp.memory.deleteConfirmTitle"
              defaultMessage="Delete this memory permanently?"
            />
          }
          onCancel={() => {
            setConfirmingDelete(false);
            setDeleteConfirmation('');
          }}
          confirmButtonText={
            <FormattedMessage
              id="xpack.significantEventsApp.memory.deleteConfirmButton"
              defaultMessage="Delete permanently"
            />
          }
          // The route echoes the title back and refuses a mismatch, so the dialog
          // makes the operator produce it rather than supplying it for them.
          confirmButtonDisabled={deleteConfirmation !== page.title}
          buttonColor="danger"
          data-test-subj="nightshiftMemoryDeleteConfirm"
          onConfirm={() => {
            setConfirmingDelete(false);
            setDeleteConfirmation('');
            // Navigating away only on success: the memory may well still be
            // there, and a failed write must leave the page in place to retry.
            deletePage({ id: page.id, confirmTitle: page.title }, { onSuccess: onDeleted });
          }}
        >
          <EuiText size="s">
            <FormattedMessage
              id="xpack.significantEventsApp.memory.deleteConfirmBody"
              defaultMessage="“{title}” will be removed from Semantic Memory. This cannot be undone — archiving keeps the record and is reversible."
              values={{ title: page.title }}
            />
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.significantEventsApp.memory.deleteConfirmFieldLabel"
                defaultMessage="Type the memory title to confirm"
              />
            }
          >
            <EuiFieldText
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              data-test-subj="nightshiftMemoryDeleteConfirmTitle"
            />
          </EuiFormRow>
        </EuiConfirmModal>
      )}
    </div>
  );
}
