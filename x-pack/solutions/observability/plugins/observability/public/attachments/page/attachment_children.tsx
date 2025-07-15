/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiCallOut, EuiText, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { type PersistableStateAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { PageAttachmentPersistedState } from '@kbn/page-attachment-schema';
import { useKibana } from '../../utils/kibana_react';

interface AttachmentChildrenProps {
  persistableStateAttachmentState: PersistableStateAttachmentViewProps['persistableStateAttachmentState'];
}

export function PageAttachmentChildren({
  persistableStateAttachmentState,
}: AttachmentChildrenProps) {
  const pageState = persistableStateAttachmentState as PageAttachmentPersistedState;
  const {
    services: {
      application,
      http: {
        externalUrl: { isInternalUrl },
      },
      notifications: { toasts },
    },
  } = useKibana();
  const { url } = pageState;
  const label = url?.label;

  const href = useMemo(() => {
    try {
      const parsedUrl = new URL(url.pathAndQuery, window.location.origin);
      return parsedUrl.href;
    } catch (e) {
      return '';
    }
  }, [url?.pathAndQuery]);

  const onClick = useCallback(() => {
    if (!isInternalUrl(href)) {
      toasts.addDanger({
        title: i18n.translate('xpack.observability.caseView.pageAttachment.externalUrlWarning', {
          defaultMessage: 'External URL detected',
        }),
        text: i18n.translate('xpack.observability.caseView.pageAttachment.externalUrlWarningText', {
          defaultMessage: 'External URLs are not supported. Please check the URL and try again.',
        }),
      });
      return;
    }

    if (href) {
      application.navigateToUrl(href);
    }
  }, [application, href, isInternalUrl, toasts]);

  if (!isInternalUrl(href)) {
    return (
      <EuiCallOut
        title={i18n.translate(
          'xpack.observability.caseView.pageAttachment.externalUrlWarningTitle',
          {
            defaultMessage: 'External URL detected',
          }
        )}
        color="danger"
        iconType="alert"
      >
        <EuiText>
          <p>
            {i18n.translate('xpack.observability.caseView.pageAttachment.externalUrlWarningText', {
              defaultMessage:
                'External URLs are not supported. Please check the URL and try again.',
            })}
          </p>
        </EuiText>
      </EuiCallOut>
    );
  }

  if (!url || !href || !label) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.observability.caseView.pageAttachment.noUrlProvidedTitle', {
          defaultMessage: 'No URL provided',
        })}
        color="danger"
        iconType="alert"
      >
        <EuiText>
          <p>
            {i18n.translate('xpack.observability.caseView.pageAttachment.noUrlProvided', {
              defaultMessage: 'This page attachment does not contain a valid URL.',
            })}
          </p>
        </EuiText>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
        {url.iconType && (
          <EuiFlexItem grow={false}>
            <EuiIcon type={url.iconType} size="m" />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiLink onClick={onClick} data-test-subj="casesPageAttachmentLink">
            <EuiText size="m">{label}</EuiText>
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

PageAttachmentChildren.displayName = 'PageAttachmentChildren';

// Note: This is for lazy loading
// eslint-disable-next-line import/no-default-export
export default PageAttachmentChildren;
