/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RumGithubLinks } from '../../../../common/rum_repository_links';

const fileIssueLabel = i18n.translate('xpack.ux.repository.fileGithubIssueButtonLabel', {
  defaultMessage: 'File GitHub issue',
});

const openFileLabel = i18n.translate('xpack.ux.repository.openSourceFileButtonLabel', {
  defaultMessage: 'Open file',
});

const addRepositoryLabel = i18n.translate('xpack.ux.repository.addRepositoryButtonLabel', {
  defaultMessage: 'Add repository',
});

export function RumGithubLinks({
  links,
  onAddRepository,
  fillIssue = false,
  showFile = true,
  grouped = true,
}: {
  links: RumGithubLinks;
  onAddRepository?: () => void;
  fillIssue?: boolean;
  showFile?: boolean;
  grouped?: boolean;
}) {
  const hasRepoActions = Boolean(links.issueHref || (showFile && links.fileHref));
  if (!hasRepoActions && !onAddRepository) {
    return null;
  }

  const items = (
    <>
      {showFile && links.fileHref ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            href={links.fileHref}
            target="_blank"
            iconType="external"
            data-test-subj="uxGithubOpenFileButton"
            aria-label={links.fileLabel ? `${openFileLabel}: ${links.fileLabel}` : openFileLabel}
          >
            {links.fileLabel ?? openFileLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
      {links.issueHref ? (
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill={fillIssue}
            href={links.issueHref}
            target="_blank"
            iconType="external"
            data-test-subj="uxGithubFileIssueButton"
          >
            {fileIssueLabel}
          </EuiButton>
        </EuiFlexItem>
      ) : onAddRepository ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="gear"
            onClick={onAddRepository}
            data-test-subj="uxGithubAddRepositoryButton"
          >
            {addRepositoryLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
    </>
  );

  if (!grouped) {
    return items;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      {items}
    </EuiFlexGroup>
  );
}
