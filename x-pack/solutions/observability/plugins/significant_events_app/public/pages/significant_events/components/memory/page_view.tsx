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
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
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
import { contentWithoutDuplicateTitle, pageMarkdownCss } from '../shared/page_markdown';

const asPercent = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 100);

/** One line with an ellipsis, for the values in the metadata footer. */
const singleLine = css`
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

interface MemoryPageViewProps {
  pageId: string;
  onSelectPage: (id: string) => void;
  /** Filter Memory home by one of this memory's tags. */
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

  // `memory` is the store's own type tag, not something the investigator wrote.
  const tags = page.tags.filter((tag) => tag !== 'memory');
  const conversationId = page.conversation_id;
  // A memory that recorded no conversation is named by its context alone; one
  // that recorded a conversation but no context still has one to link to.
  const sourceTask =
    page.context && page.context.length > 0
      ? page.context
      : conversationId
      ? i18n.translate('xpack.significantEventsApp.memory.metadata.conversationLabel', {
          defaultMessage: 'Agent Builder conversation',
        })
      : undefined;
  const archiveReason = page.archived ? page.archive_reason : undefined;
  // The merged-from row fetches its sources, so the section is only opened when
  // the page claims it has any.
  const hasProvenance = sourceTask !== undefined || (page.merged_from?.length ?? 0) > 0;

  return (
    <div data-test-subj="nightshiftMemoryPageView">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              {/* Outranks the memory's own markdown headings, which are content
                  rather than chrome. */}
              <EuiTitle size="m">
                <h2 data-test-subj="nightshiftMemoryPageTitle">{page.title}</h2>
              </EuiTitle>
            </EuiFlexItem>
            {/* The state a reader has to know before the provenance row explains
                it: an archived memory is out of recall. */}
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

      {/* The page's own bookkeeping, rather than part of what the memory says: it
          sits under the content so a reader gets the memory first and the
          provenance after it. What is worth trusting comes first, then where it
          came from, then what it is related to. A row with nothing to say is
          left out. */}
      <EuiSpacer size="l" />
      <EuiPanel
        color="subdued"
        hasShadow={false}
        paddingSize="m"
        data-test-subj="nightshiftMemoryMetadata"
      >
        <EuiFlexGroup gutterSize="l" wrap responsive={false}>
          {/* No colour on the rates: 0% usefulness means "never surfaced", which is
              the normal state for a new memory, so painting it as a warning would
              cry wolf on every cold start. The data-test-subj is what a test
              asserts against. */}
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
          {/* An archived memory is out of recall, so the reason it was retired
              reads beside the two rates it is trusted on. A pre-`archive_reason`
              document is archived with nothing to say why. */}
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
                    {/* One line, with the full text on hover: a provenance row that
                        wraps over three lines is louder than it is useful. */}
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
              {/* Each tag is a keyword the store already ranks, so clicking one
                  answers "what else is about this?" rather than describing the
                  tag back at the reader. */}
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
