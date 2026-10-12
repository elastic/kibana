/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiConfirmModal,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { FormattedMessage, FormattedNumber, FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useKibana } from '../../../../hooks/use_kibana';
import { getMemoryArchiveReasonLabel } from './labels';
import { MemoryMergedFromRow } from './lineage';
import { getSourceTaskPath } from './source_task';
import { useDeleteMemoryPage, useMemoryPage, useSetMemoryArchived } from './use_memory';
import type { MemoryDetailResult } from './types';
import { contentWithoutDuplicateTitle, pageMarkdownCss } from '../shared/page_markdown';

const asPercent = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 100);

const singleLine = css`
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

interface MemoryPageViewProps {
  pageId: string;
  onSelectPage: (id: string) => void;
  onSelectKeyword: (keyword: string) => void;
  onDeleted: () => void;
}

export function MemoryPageView({
  pageId,
  onSelectPage,
  onSelectKeyword,
  onDeleted,
}: MemoryPageViewProps) {
  const {
    core: {
      application: {
        capabilities: { nightshift },
      },
      http,
    },
  } = useKibana();
  // Mirrors the route privilege tiers: read users see no actions rather than a 403.
  const { canManage, canManageAndConfigure } = getNightshiftCapabilities(nightshift);

  const { data, isLoading, isError } = useMemoryPage(pageId);
  const { mutate: setArchived, isLoading: isArchiving } = useSetMemoryArchived();
  const { mutate: deletePage, isLoading: isDeleting } = useDeleteMemoryPage();
  // Snapshotted when the dialog opens so a refetch cannot swap in an unreviewed revision.
  const [deleteTarget, setDeleteTarget] = useState<
    { id: string; version: MemoryDetailResult['version'] } | undefined
  >();
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

  // `memory` is the store's own type tag, not something the investigator wrote.
  const tags = page.tags.filter((tag) => tag !== 'memory');
  const conversationId = page.conversation_id;
  const sourceTask =
    page.context && page.context.length > 0
      ? page.context
      : conversationId
      ? i18n.translate('xpack.significantEventsApp.memory.metadata.conversationLabel', {
          defaultMessage: 'Agent Builder conversation',
        })
      : undefined;
  const archiveReason = page.archived ? page.archive_reason : undefined;
  const hasProvenance = sourceTask !== undefined || (page.merged_from?.length ?? 0) > 0;

  return (
    <div data-test-subj="nightshiftMemoryPageView">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiTitle size="m">
                <h2 data-test-subj="nightshiftMemoryPageTitle">{page.title}</h2>
              </EuiTitle>
            </EuiFlexItem>
            {page.archived && (
              <EuiFlexItem grow={false}>
                <EuiBadge data-test-subj="nightshiftMemoryArchivedTitleBadge">
                  <FormattedMessage
                    id="xpack.significantEventsApp.memory.metadata.archivedLabel"
                    defaultMessage="Archived"
                  />
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
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
        {canManageAndConfigure && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              color="danger"
              iconType="trash"
              isDisabled={isDeleting}
              onClick={() => setDeleteTarget({ id: page.id, version: data.version })}
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

      <EuiSpacer size="m" />
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

      <EuiSpacer size="l" />
      <EuiPanel
        color="subdued"
        hasShadow={false}
        paddingSize="m"
        data-test-subj="nightshiftMemoryMetadata"
      >
        <EuiFlexGroup gutterSize="l" wrap responsive={false}>
          <EuiStat
            titleSize="s"
            reverse
            textAlign="left"
            isLoading={false}
            title={
              <span data-test-subj="nightshiftMemoryUsefulnessValue">
                <FormattedNumber value={asPercent(data.usefulness)} />%
              </span>
            }
            description={
              <FormattedMessage
                id="xpack.significantEventsApp.memory.telemetry.usefulnessLabel"
                defaultMessage="Usefulness"
              />
            }
          />
          <EuiStat
            titleSize="s"
            reverse
            textAlign="left"
            isLoading={false}
            title={
              <span data-test-subj="nightshiftMemoryConfidenceValue">
                <FormattedNumber value={asPercent(data.confidence)} />%
              </span>
            }
            description={
              <FormattedMessage
                id="xpack.significantEventsApp.memory.telemetry.confidenceLabel"
                defaultMessage="Confidence"
              />
            }
          />
          <EuiStat
            titleSize="s"
            reverse
            textAlign="left"
            isLoading={false}
            title={<FormattedRelative value={page.updated_at} />}
            description={
              <FormattedMessage
                id="xpack.significantEventsApp.memory.metadata.updatedLabel"
                defaultMessage="Updated"
              />
            }
          />
          {archiveReason !== undefined && (
            <EuiStat
              titleSize="s"
              reverse
              textAlign="left"
              isLoading={false}
              title={
                <EuiBadge color="hollow" data-test-subj="nightshiftMemoryArchivedBadge">
                  {getMemoryArchiveReasonLabel(archiveReason)}
                </EuiBadge>
              }
              description={
                <FormattedMessage
                  id="xpack.significantEventsApp.memory.metadata.archivedLabel"
                  defaultMessage="Archived"
                />
              }
            />
          )}
        </EuiFlexGroup>

        {hasProvenance && (
          <>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList
              type="column"
              compressed
              columnWidths={['auto', 'minmax(0, 1fr)']}
              data-test-subj="nightshiftMemoryProvenance"
            >
              {sourceTask !== undefined && (
                <>
                  <EuiDescriptionListTitle>
                    <FormattedMessage
                      id="xpack.significantEventsApp.memory.metadata.sourceTaskLabel"
                      defaultMessage="Source task"
                    />
                  </EuiDescriptionListTitle>
                  <EuiDescriptionListDescription data-test-subj="nightshiftMemorySourceTask">
                    <span className={singleLine} title={sourceTask}>
                      {conversationId ? (
                        <EuiLink
                          href={http.basePath.prepend(
                            getSourceTaskPath(conversationId, page.agent_id)
                          )}
                          data-test-subj="nightshiftMemorySourceTaskLink"
                        >
                          {sourceTask}
                        </EuiLink>
                      ) : (
                        sourceTask
                      )}
                    </span>
                  </EuiDescriptionListDescription>
                </>
              )}

              <MemoryMergedFromRow page={page} onSelectPage={onSelectPage} />
            </EuiDescriptionList>
          </>
        )}

        {tags.length > 0 && (
          <>
            {hasProvenance && <EuiHorizontalRule margin="m" />}
            <EuiTitle size="xxs">
              <h3>
                <FormattedMessage
                  id="xpack.significantEventsApp.memory.metadata.tagsLabel"
                  defaultMessage="Tags"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiBadgeGroup gutterSize="xs">
              {tags.map((tag) => (
                <EuiBadge
                  key={tag}
                  color="hollow"
                  onClick={() => onSelectKeyword(tag)}
                  onClickAriaLabel={i18n.translate(
                    'xpack.significantEventsApp.memory.metadata.tagFilterLabel',
                    { defaultMessage: 'Filter memories by {tag}', values: { tag } }
                  )}
                  data-test-subj={`nightshiftMemoryTag-${tag}`}
                >
                  {tag}
                </EuiBadge>
              ))}
            </EuiBadgeGroup>
          </>
        )}
      </EuiPanel>

      {deleteTarget && (
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
            setDeleteTarget(undefined);
          }}
          cancelButtonText={i18n.translate(
            'xpack.significantEventsApp.memory.deleteConfirmCancel',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={
            <FormattedMessage
              id="xpack.significantEventsApp.memory.deleteConfirmButton"
              defaultMessage="Delete permanently"
            />
          }
          buttonColor="danger"
          data-test-subj="nightshiftMemoryDeleteConfirm"
          onConfirm={() => {
            setDeleteTarget(undefined);
            deletePage(
              { id: deleteTarget.id, version: deleteTarget.version },
              { onSuccess: onDeleted }
            );
          }}
        >
          <EuiText size="s">
            <FormattedMessage
              id="xpack.significantEventsApp.memory.deleteConfirmBody"
              defaultMessage="This memory will be removed from Semantic Memory. This cannot be undone — archiving keeps the record and is reversible."
            />
          </EuiText>
        </EuiConfirmModal>
      )}
    </div>
  );
}
