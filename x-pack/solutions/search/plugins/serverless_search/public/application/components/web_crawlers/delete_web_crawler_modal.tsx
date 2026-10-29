/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { WebCrawler } from '../../../../common/types/web_crawlers';
import { useDeleteWebCrawler } from '../../hooks/api/use_delete_web_crawler';

interface DeleteWebCrawlerModalProps {
  crawler: WebCrawler;
  onClose: () => void;
}

export const DeleteWebCrawlerModal: React.FC<DeleteWebCrawlerModalProps> = ({
  crawler,
  onClose,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const { mutate, isLoading, error } = useDeleteWebCrawler(onClose);

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={i18n.translate('xpack.serverlessSearch.webCrawlers.deleteModal.title', {
        defaultMessage: 'Delete web crawler {name}?',
        values: { name: crawler.name },
      })}
      onCancel={onClose}
      onConfirm={() => mutate(crawler.id)}
      cancelButtonText={i18n.translate('xpack.serverlessSearch.webCrawlers.deleteModal.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.serverlessSearch.webCrawlers.deleteModal.confirm', {
        defaultMessage: 'Delete web crawler',
      })}
      buttonColor="danger"
      isLoading={isLoading}
      data-test-subj="serverlessSearchDeleteWebCrawlerModal"
    >
      <p>
        {i18n.translate('xpack.serverlessSearch.webCrawlers.deleteModal.description', {
          defaultMessage:
            'The crawler and its schedule are removed. Documents already indexed into {index} are kept.',
          values: { index: crawler.output_index },
        })}
      </p>
      {error ? (
        <p>{(error as { body?: { message?: string } }).body?.message ?? String(error)}</p>
      ) : null}
    </EuiConfirmModal>
  );
};
