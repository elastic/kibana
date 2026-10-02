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
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useKibana } from '../../../../hooks/use_kibana';
import { MemoryLineage } from './lineage';
import { MemorySourceTaskLink } from './source_task_link';
import { MemoryTelemetryPanel } from './telemetry_panel';
import { useDeleteMemoryPage, useMemoryPage, useSetMemoryArchived } from './use_memory';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const contentWithoutDuplicateTitle = (title: string, content: string): string =>
  content.replace(new RegExp(`^#{1,3}\\s*${escapeRegExp(title)}\\s*\\n+`, 'i'), '');

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
  const setArchived = useSetMemoryArchived();
  const deletePage = useDeleteMemoryPage();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
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

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setActionError(undefined);
    try {
      await action();
    } catch (error) {
      // A conflict means the optimizer wrote between our read and write. Say so
      // rather than silently retrying, so what is on screen is not a guess.
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

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
              <EuiButton
                size="s"
                iconType={page.archived ? 'refresh' : 'archive'}
                isLoading={busy}
                onClick={() => runAction(() => setArchived(page.id, !page.archived))}
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
              isDisabled={busy}
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

      {actionError !== undefined && (
        <>
          <EuiSpacer size="s" />
          <EuiPanel color="danger" paddingSize="s" data-test-subj="nightshiftMemoryActionError">
            <EuiText size="xs">
              <FormattedMessage
                id="xpack.significantEventsApp.memory.actionError"
                defaultMessage="That action could not be completed: {message}"
                values={{ message: actionError }}
              />
            </EuiText>
          </EuiPanel>
        </>
      )}

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
        <div
          className={css`
            .euiMarkdownFormat :not(pre) > code {
              background: transparent;
              padding: 0;
              border-radius: 0;
              box-shadow: none;
            }
          `}
        >
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
          onCancel={() => setConfirmingDelete(false)}
          confirmButtonText={
            <FormattedMessage
              id="xpack.significantEventsApp.memory.deleteConfirmButton"
              defaultMessage="Delete permanently"
            />
          }
          buttonColor="danger"
          data-test-subj="nightshiftMemoryDeleteConfirm"
          onConfirm={() => {
            setConfirmingDelete(false);
            return runAction(async () => {
              await deletePage(page.id, page.title);
              onDeleted();
            });
          }}
        >
          <EuiText size="s">
            <FormattedMessage
              id="xpack.significantEventsApp.memory.deleteConfirmBody"
              defaultMessage="“{title}” will be removed from Semantic Memory. This cannot be undone — archiving keeps the record and is reversible."
              values={{ title: page.title }}
            />
          </EuiText>
        </EuiConfirmModal>
      )}
    </div>
  );
}
