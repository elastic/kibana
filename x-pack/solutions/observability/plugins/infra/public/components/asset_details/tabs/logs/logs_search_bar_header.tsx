/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getLogsLocatorFromUrlService, getNodeQuery } from '@kbn/logs-shared-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { OpenInLogsExplorerButton } from '@kbn/logs-shared-plugin/public';
import moment from 'moment';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';

const TEXT_QUERY_THROTTLE_INTERVAL_MS = 500;

export const LogsSearchBarHeader = () => {
  const { getDateRangeInTimestamp } = useDatePickerContext();
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const { entity } = useAssetDetailsRenderPropsContext();

  const {
    services: {
      share: { url },
    },
  } = useKibanaContextForPlugin();
  const logsLocator = getLogsLocatorFromUrlService(url)!;
  const [textQuery, setTextQuery] = useState(urlState?.logsSearch ?? '');
  const [textQueryDebounced, setTextQueryDebounced] = useState(urlState?.logsSearch ?? '');

  useDebounce(
    () => {
      setUrlState({ logsSearch: textQuery });
      setTextQueryDebounced(textQuery);
    },
    TEXT_QUERY_THROTTLE_INTERVAL_MS,
    [textQuery]
  );

  const onQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextQuery(e.target.value);
  }, []);

  const { to: currentTimestamp } = getDateRangeInTimestamp();
  const startTimestamp = currentTimestamp - 60 * 60 * 1000;

  const logsUrl = useMemo(() => {
    return logsLocator.getRedirectUrl({
      query: getNodeQuery({
        nodeField: findInventoryFields(entity.type).id,
        nodeId: entity.id,
        filter: textQueryDebounced,
      }),
      timeRange: {
        from: moment(startTimestamp).toISOString(),
        to: moment(currentTimestamp).toISOString(),
      },
    });
  }, [logsLocator, entity.type, entity.id, textQueryDebounced, startTimestamp, currentTimestamp]);

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiFieldSearch
          data-test-subj="infraAssetDetailsLogsTabFieldSearch"
          fullWidth
          placeholder={i18n.translate('xpack.infra.nodeDetails.logs.textFieldPlaceholder', {
            defaultMessage: 'Search for log entries...',
          })}
          value={textQuery}
          isClearable
          onChange={onQueryChange}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <OpenInLogsExplorerButton
          href={logsUrl}
          testSubject="infraAssetDetailsLogsTabOpenInLogsButton"
          size="xs"
          flush="both"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
