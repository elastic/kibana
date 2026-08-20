/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiBadge, EuiBasicTable, EuiLink, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { compareWatchesForDisplay, type Watch } from '@kbn/pnd-common';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useWatches } from '../../hooks/use_watches_api';
import { WatchesSectionLayout } from './components/watches_section_layout';
import * as i18n from './translations';

export const WatchesPage: React.FC = () => {
  usePndDocTitle(i18n.PAGE_TITLE);
  const history = useHistory();
  const { data, isLoading } = useWatches();

  const watches = useMemo(
    () => [...(data?.watches ?? [])].sort(compareWatchesForDisplay),
    [data?.watches]
  );

  return (
    <WatchesSectionLayout active="watches" title={i18n.PAGE_TITLE} description={i18n.PAGE_SUBTITLE}>
      <PndPageSection>
        {isLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : watches.length === 0 ? (
          <EuiText size="s" color="subdued">
            {i18n.STUB_EMPTY_BODY}
          </EuiText>
        ) : (
          <EuiBasicTable<Watch>
            items={watches}
            tableCaption={i18n.PAGE_TITLE}
            rowProps={(watch) => ({
              onClick: () => history.push(`/watches/${watch.id}`),
            })}
            columns={[
              {
                field: 'name',
                name: i18n.COL_NAME,
                render: (_name: string, watch: Watch) => (
                  <EuiLink
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      history.push(`/watches/${watch.id}`);
                    }}
                    data-test-subj={`pndWatchLink-${watch.id}`}
                  >
                    <strong>{watch.name}</strong>
                  </EuiLink>
                ),
              },
              {
                field: 'mandate',
                name: i18n.WATCHES_SECTION_TITLE,
                truncateText: true,
              },
              {
                field: 'enabled',
                name: i18n.COL_STATUS,
                render: (enabled: boolean) =>
                  enabled ? (
                    <EuiBadge color="success">{i18n.STATUS_ENABLED}</EuiBadge>
                  ) : (
                    <EuiBadge color="default">{i18n.COL_STATUS}</EuiBadge>
                  ),
              },
            ]}
          />
        )}
      </PndPageSection>
    </WatchesSectionLayout>
  );
};
