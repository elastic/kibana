/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { getWikiEntityTypeLabel, getWikiStatusLabel } from './entity_type_labels';
import { WikiPageEditor } from './page_editor';
import { useArchiveWikiPage, useWikiPage } from './use_wiki';
import { contentWithoutDuplicateTitle, pageMarkdownCss } from '../page_markdown';

interface WikiPageViewProps {
  pageId: string;
  canEdit: boolean;
  onArchived: () => void;
}

export function WikiPageView({ pageId, canEdit, onArchived }: WikiPageViewProps) {
  const { data, isLoading, isError } = useWikiPage(pageId);
  const page = data?.page;
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const archiveTitleId = useGeneratedHtmlId();
  const { mutate: archivePage, isLoading: isArchiving } = useArchiveWikiPage();

  if (isLoading) {
    return <EuiLoadingSpinner size="l" data-test-subj="nightshiftWikiPageLoading" />;
  }

  if (isError || !page) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        title={
          <h2>
            <FormattedMessage
              id="xpack.nightshift.knowledge.wiki.pageNotFoundTitle"
              defaultMessage="Page not found"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.nightshift.knowledge.wiki.pageNotFoundDescription"
              defaultMessage="This Wiki page could not be loaded."
            />
          </p>
        }
      />
    );
  }

  const { version } = page;
  const canWrite = canEdit && version !== undefined;

  if (isEditing && version !== undefined) {
    return <WikiPageEditor page={page} version={version} onDone={() => setIsEditing(false)} />;
  }

  return (
    <div data-test-subj="nightshiftWikiPageView">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{page.title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        {canWrite && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="pencil"
              onClick={() => setIsEditing(true)}
              data-test-subj="nightshiftWikiPageEdit"
            >
              <FormattedMessage
                id="xpack.nightshift.knowledge.wiki.pageEditButton"
                defaultMessage="Edit"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        {canWrite && page.status !== 'archived' && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="trash"
              color="danger"
              onClick={() => setIsConfirmingArchive(true)}
              data-test-subj="nightshiftWikiPageArchive"
            >
              <FormattedMessage
                id="xpack.nightshift.knowledge.wiki.pageArchiveButton"
                defaultMessage="Archive"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{getWikiEntityTypeLabel(page.entity_type)}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={page.status === 'established' ? 'success' : 'hollow'}>
            {getWikiStatusLabel(page.status)}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.nightshift.knowledge.wiki.pageCorroborationsLabel"
              defaultMessage="{count, plural, one {# corroboration} other {# corroborations}}"
              values={{ count: page.corroborations }}
            />
            {' · '}
            <FormattedMessage
              id="xpack.nightshift.knowledge.wiki.pageUpdatedLabel"
              defaultMessage="Updated {when}"
              values={{ when: <FormattedRelative value={page.updated_at} /> }}
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {page.description !== undefined && page.description.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>{page.description}</p>
          </EuiText>
        </>
      )}
      <EuiSpacer />
      {page.content.length > 0 ? (
        <div className={pageMarkdownCss}>
          <EuiMarkdownFormat textSize="s">
            {contentWithoutDuplicateTitle(page.title, page.content)}
          </EuiMarkdownFormat>
        </div>
      ) : (
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.nightshift.knowledge.wiki.pageEmptyContentDescription"
            defaultMessage="This page has no content yet."
          />
        </EuiText>
      )}
      {isConfirmingArchive && version !== undefined && (
        <EuiConfirmModal
          aria-labelledby={archiveTitleId}
          titleProps={{ id: archiveTitleId }}
          title={i18n.translate('xpack.nightshift.knowledge.wiki.archiveConfirmTitle', {
            defaultMessage: 'Archive "{title}"?',
            values: { title: page.title },
          })}
          onCancel={() => setIsConfirmingArchive(false)}
          onConfirm={() =>
            archivePage(
              { id: page.id, version },
              // Closing on failure makes the user review the refreshed page before trying again.
              { onSuccess: onArchived, onError: () => setIsConfirmingArchive(false) }
            )
          }
          isLoading={isArchiving}
          cancelButtonText={i18n.translate('xpack.nightshift.knowledge.wiki.archiveConfirmCancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate(
            'xpack.nightshift.knowledge.wiki.archiveConfirmButton',
            { defaultMessage: 'Archive' }
          )}
          buttonColor="danger"
          data-test-subj="nightshiftWikiArchiveConfirm"
        >
          <p>
            <FormattedMessage
              id="xpack.nightshift.knowledge.wiki.archiveConfirmDescription"
              defaultMessage="Investigations will stop loading this page. You can restore it later by editing its status."
            />
          </p>
        </EuiConfirmModal>
      )}
    </div>
  );
}
