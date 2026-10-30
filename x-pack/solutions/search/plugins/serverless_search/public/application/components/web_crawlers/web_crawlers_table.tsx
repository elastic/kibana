/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedTime } from '@kbn/i18n-react';
import type { WebCrawler, WebCrawlerStatus } from '../../../../common/types/web_crawlers';
import { useStartCrawl } from '../../hooks/api/use_start_crawl';
import { CreateWebCrawlerFlyout } from './create_web_crawler_flyout';
import { DeleteWebCrawlerModal } from './delete_web_crawler_modal';

interface WebCrawlersTableProps {
  crawlers: WebCrawler[];
}

const STATUS_BADGES: Record<WebCrawlerStatus, { color: string; label: string }> = {
  pending: {
    color: 'hollow',
    label: i18n.translate('xpack.serverlessSearch.webCrawlers.status.pending', {
      defaultMessage: 'Starting',
    }),
  },
  healthy: {
    color: 'success',
    label: i18n.translate('xpack.serverlessSearch.webCrawlers.status.healthy', {
      defaultMessage: 'Healthy',
    }),
  },
  degraded: {
    color: 'warning',
    label: i18n.translate('xpack.serverlessSearch.webCrawlers.status.degraded', {
      defaultMessage: 'Degraded',
    }),
  },
  failed: {
    color: 'danger',
    label: i18n.translate('xpack.serverlessSearch.webCrawlers.status.failed', {
      defaultMessage: 'Failed',
    }),
  },
  offline: {
    color: 'default',
    label: i18n.translate('xpack.serverlessSearch.webCrawlers.status.offline', {
      defaultMessage: 'Offline',
    }),
  },
  stopped: {
    color: 'default',
    label: i18n.translate('xpack.serverlessSearch.webCrawlers.status.stopped', {
      defaultMessage: 'Stopped',
    }),
  },
};

const START_CRAWL_LABEL = i18n.translate('xpack.serverlessSearch.webCrawlers.table.startCrawl', {
  defaultMessage: 'Start crawl',
});

const DELETE_LABEL = i18n.translate('xpack.serverlessSearch.webCrawlers.table.delete', {
  defaultMessage: 'Delete',
});

const EDIT_LABEL = i18n.translate('xpack.serverlessSearch.webCrawlers.table.edit', {
  defaultMessage: 'Edit',
});

const crawlStatusLabel = (status?: string) => {
  switch (status) {
    case 'running':
      return i18n.translate('xpack.serverlessSearch.webCrawlers.crawl.running', {
        defaultMessage: 'Running',
      });
    case 'success':
      return i18n.translate('xpack.serverlessSearch.webCrawlers.crawl.success', {
        defaultMessage: 'Succeeded',
      });
    case 'failure':
      return i18n.translate('xpack.serverlessSearch.webCrawlers.crawl.failure', {
        defaultMessage: 'Failed',
      });
    default:
      return i18n.translate('xpack.serverlessSearch.webCrawlers.crawl.none', {
        defaultMessage: 'No crawl yet',
      });
  }
};

export const WebCrawlersTable: React.FC<WebCrawlersTableProps> = ({ crawlers }) => {
  const [crawlerToDelete, setCrawlerToDelete] = useState<WebCrawler | null>(null);
  const [crawlerToEdit, setCrawlerToEdit] = useState<WebCrawler | null>(null);
  const { mutate: startCrawl, isLoading: isStartingCrawl } = useStartCrawl();

  const columns: Array<EuiBasicTableColumn<WebCrawler>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.serverlessSearch.webCrawlers.table.nameColumn', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
    },
    {
      field: 'output_index',
      name: i18n.translate('xpack.serverlessSearch.webCrawlers.table.indexColumn', {
        defaultMessage: 'Index',
      }),
      truncateText: true,
    },
    {
      field: 'domains',
      name: i18n.translate('xpack.serverlessSearch.webCrawlers.table.domainsColumn', {
        defaultMessage: 'Domains',
      }),
      render: (domains: WebCrawler['domains']) => (
        <EuiText size="s">{domains.map((domain) => domain.url).join(', ')}</EuiText>
      ),
    },
    {
      field: 'schedule',
      name: i18n.translate('xpack.serverlessSearch.webCrawlers.table.scheduleColumn', {
        defaultMessage: 'Schedule',
      }),
      render: (schedule?: string) =>
        schedule ??
        i18n.translate('xpack.serverlessSearch.webCrawlers.table.manualSchedule', {
          defaultMessage: 'Manual',
        }),
    },
    {
      field: 'status',
      name: i18n.translate('xpack.serverlessSearch.webCrawlers.table.statusColumn', {
        defaultMessage: 'Status',
      }),
      render: (status: WebCrawlerStatus, crawler: WebCrawler) => (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiBadge color={STATUS_BADGES[status].color}>{STATUS_BADGES[status].label}</EuiBadge>
          </EuiFlexItem>
          {crawler.status_message ? (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {crawler.status_message}
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'last_crawl',
      name: i18n.translate('xpack.serverlessSearch.webCrawlers.table.lastCrawlColumn', {
        defaultMessage: 'Last crawl',
      }),
      render: (lastCrawl: WebCrawler['last_crawl']) => {
        const timestamp = lastCrawl?.finished_at ?? lastCrawl?.started_at;
        return (
          <EuiText size="s">
            {crawlStatusLabel(lastCrawl?.status)}
            {timestamp ? (
              <>
                {' '}
                (<FormattedDate value={timestamp} year="numeric" month="short" day="2-digit" />{' '}
                <FormattedTime value={timestamp} />)
              </>
            ) : null}
          </EuiText>
        );
      },
    },
    {
      name: i18n.translate('xpack.serverlessSearch.webCrawlers.table.actionsColumn', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: START_CRAWL_LABEL,
          description: i18n.translate(
            'xpack.serverlessSearch.webCrawlers.table.startCrawlDescription',
            { defaultMessage: 'Start a crawl now' }
          ),
          render: (crawler: WebCrawler) => (
            <EuiToolTip content={START_CRAWL_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                data-test-subj="serverlessSearchWebCrawlerStartCrawlButton"
                iconType="play"
                aria-label={START_CRAWL_LABEL}
                isDisabled={
                  isStartingCrawl ||
                  crawler.status !== 'healthy' ||
                  crawler.last_crawl?.status === 'running'
                }
                onClick={() => startCrawl(crawler.id)}
              />
            </EuiToolTip>
          ),
        },
        {
          name: EDIT_LABEL,
          description: i18n.translate('xpack.serverlessSearch.webCrawlers.table.editDescription', {
            defaultMessage: 'Edit this web crawler',
          }),
          render: (crawler: WebCrawler) => (
            <EuiToolTip content={EDIT_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                data-test-subj="serverlessSearchWebCrawlerEditButton"
                iconType="pencil"
                aria-label={EDIT_LABEL}
                onClick={() => setCrawlerToEdit(crawler)}
              />
            </EuiToolTip>
          ),
        },
        {
          name: DELETE_LABEL,
          description: i18n.translate(
            'xpack.serverlessSearch.webCrawlers.table.deleteDescription',
            {
              defaultMessage: 'Delete this web crawler',
            }
          ),
          render: (crawler: WebCrawler) => (
            <EuiToolTip content={DELETE_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                data-test-subj="serverlessSearchWebCrawlerDeleteButton"
                iconType="trash"
                color="danger"
                aria-label={DELETE_LABEL}
                onClick={() => setCrawlerToDelete(crawler)}
              />
            </EuiToolTip>
          ),
        },
      ],
    },
  ];

  return (
    <>
      <EuiBasicTable
        data-test-subj="serverlessSearchWebCrawlersTable"
        items={crawlers}
        columns={columns}
        rowHeader="name"
        tableCaption={i18n.translate('xpack.serverlessSearch.webCrawlers.table.caption', {
          defaultMessage: 'Elastic managed web crawlers',
        })}
      />
      {crawlerToDelete ? (
        <DeleteWebCrawlerModal crawler={crawlerToDelete} onClose={() => setCrawlerToDelete(null)} />
      ) : null}
      {crawlerToEdit ? (
        <CreateWebCrawlerFlyout crawler={crawlerToEdit} onClose={() => setCrawlerToEdit(null)} />
      ) : null}
    </>
  );
};
