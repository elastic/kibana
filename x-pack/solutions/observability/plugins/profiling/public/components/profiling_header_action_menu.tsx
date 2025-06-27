/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiHeaderLink, EuiHeaderLinks, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import qs from 'query-string';
import React from 'react';
import { useHistory } from 'react-router-dom';
import url from 'url';
import { useProfilingRouter } from '../hooks/use_profiling_router';
import { AddDataTabs } from '../views/add_data_view';

export function ProfilingHeaderActionMenu() {
  const router = useProfilingRouter();
  const history = useHistory();

  return (
    <EuiHeaderLinks gutterSize="xs">
      <EuiToolTip
        content={i18n.translate('xpack.profiling.header.storageExplorerLink.tooltip', {
          defaultMessage: 'This module is not GA. Please help us by reporting any bugs.',
        })}
      >
        <EuiHeaderLink
          color="primary"
          onClick={() => {
            const query = qs.parse(window.location.search);
            const storageExplorerURL = url.format({
              pathname: '/storage-explorer',
              query: {
                kuery: query.kuery,
                rangeFrom: query.rangeFrom || 'now-15m',
                rangeTo: query.rangeTo || 'now',
              },
            });
            history.push(storageExplorerURL);
          }}
        >
          {i18n.translate('xpack.profiling.headerActionMenu.storageExplorer', {
            defaultMessage: 'Storage Explorer',
          })}
        </EuiHeaderLink>
      </EuiToolTip>
      <EuiHeaderLink href={router.link('/settings')} color="primary">
        {i18n.translate('xpack.profiling.headerActionMenu.settings', {
          defaultMessage: 'Settings',
        })}
      </EuiHeaderLink>
      <EuiHeaderLink
        href={router.link('/add-data-instructions', {
          query: { selectedTab: AddDataTabs.Kubernetes },
        })}
        color="primary"
      >
        {i18n.translate('xpack.profiling.headerActionMenu.addData', {
          defaultMessage: 'Add Data',
        })}
      </EuiHeaderLink>
    </EuiHeaderLinks>
  );
}
