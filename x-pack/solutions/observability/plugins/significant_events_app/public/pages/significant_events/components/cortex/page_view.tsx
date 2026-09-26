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
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { getCortexEntityTypeLabel, getCortexStatusLabel } from './entity_type_labels';
import { CortexPageEditor } from './page_editor';
import { useArchiveCortexPage, useCortexPage } from './use_cortex';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const contentWithoutDuplicateTitle = (title: string, content: string): string =>
  content.replace(new RegExp(`^#{1,3}\\s*${escapeRegExp(title)}\\s*\\n+`, 'i'), '');

interface CortexPageViewProps {
  pageId: string;
  canEdit: boolean;
  onArchived: () => void;
}

export function CortexPageView({ pageId, canEdit, onArchived }: CortexPageViewProps) {
  const { data, isLoading, isError } = useCortexPage(pageId);
  const page = data?.page;
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const archiveTitleId = useGeneratedHtmlId();
  const { mutate: archivePage, isLoading: isArchiving } = useArchiveCortexPage();

  if (isLoading) {
    return <EuiLoadingSpinner size="l" data-test-subj="nightshiftCortexPageLoading" />;
  }

  if (isError || !page) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        title={
          <h2>
            <FormattedMessage
              id="xpack.significantEventsApp.cortex.pageNotFoundTitle"
              defaultMessage="Page not found"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.significantEventsApp.cortex.pageNotFoundDescription"
              defaultMessage="This Cortex page could not be loaded."
            />
          </p>
        }
      />
    );
  }

  if (isEditing) {
    return <CortexPageEditor page={page} onDone={() => setIsEditing(false)} />;
  }

  return (
    <div data-test-subj="nightshiftCortexPageView">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{page.title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        {canEdit && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="pencil"
              onClick={() => setIsEditing(true)}
              data-test-subj="nightshiftCortexPageEdit"
            >
              <FormattedMessage
                id="xpack.significantEventsApp.cortex.pageEditButton"
                defaultMessage="Edit"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        {canEdit && page.status !== 'archived' && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="trash"
              color="danger"
              onClick={() => setIsConfirmingArchive(true)}
              data-test-subj="nightshiftCortexPageArchive"
            >
              <FormattedMessage
                id="xpack.significantEventsApp.cortex.pageArchiveButton"
                defaultMessage="Archive"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{getCortexEntityTypeLabel(page.entity_type)}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={page.status === 'established' ? 'success' : 'hollow'}>
            {getCortexStatusLabel(page.status)}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.significantEventsApp.cortex.pageCorroborationsLabel"
              defaultMessage="{count, plural, one {# corroboration} other {# corroborations}}"
              values={{ count: page.corroborations }}
            />
            {' · '}
            <FormattedMessage
              id="xpack.significantEventsApp.cortex.pageUpdatedLabel"
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
            id="xpack.significantEventsApp.cortex.pageEmptyContentDescription"
            defaultMessage="This page has no content yet."
          />
        </EuiText>
      )}
      {isConfirmingArchive && (
        <EuiConfirmModal
          aria-labelledby={archiveTitleId}
          titleProps={{ id: archiveTitleId }}
          title={i18n.translate('xpack.significantEventsApp.cortex.archiveConfirmTitle', {
            defaultMessage: 'Archive "{title}"?',
            values: { title: page.title },
          })}
          onCancel={() => setIsConfirmingArchive(false)}
          onConfirm={() => archivePage(page.id, { onSuccess: onArchived })}
          isLoading={isArchiving}
          cancelButtonText={i18n.translate(
            'xpack.significantEventsApp.cortex.archiveConfirmCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.significantEventsApp.cortex.archiveConfirmButton',
            { defaultMessage: 'Archive' }
          )}
          buttonColor="danger"
          data-test-subj="nightshiftCortexArchiveConfirm"
        >
          <p>
            <FormattedMessage
              id="xpack.significantEventsApp.cortex.archiveConfirmDescription"
              defaultMessage="Investigations will stop loading this page. You can restore it later by editing its status."
            />
          </p>
        </EuiConfirmModal>
      )}
    </div>
  );
}
