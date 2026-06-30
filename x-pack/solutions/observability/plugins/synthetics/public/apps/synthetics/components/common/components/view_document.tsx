/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { UnifiedDocViewer, useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import type { MouseEvent } from 'react';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useDateFormat } from '../../../../../hooks/use_date_format';
import { LoadingState } from '../../monitors_page/overview/overview/monitor_detail_flyout';
import { useSyntheticsDataView } from '../../../contexts/synthetics_data_view_context';
import { getSyntheticsCcsIndex } from '../../../../../../common/get_synthetics_indices';
import type { Ping } from '../../../../../../common/runtime_types';
import type { ClientPluginsStart } from '../../../../../plugin';

export const ViewDocument = ({ ping }: { ping: Ping }) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState<boolean>(false);

  const remoteName = ping.remote?.remoteName;
  const indexPattern = getSyntheticsCcsIndex(remoteName);

  const localDataView = useSyntheticsDataView();
  const { dataView: remoteDataView, error: remoteDataViewError } = useRemoteDataView(
    remoteName ? indexPattern : undefined
  );
  const dataView = remoteName ? remoteDataView : localDataView;

  const formatter = useDateFormat();
  const formattedTimestamp = formatter(ping['@timestamp']);

  const [, hit] = useEsDocSearch({
    id: ping.docId,
    index: indexPattern,
    dataView: dataView as DataView,
    skip: !dataView,
  });

  return (
    <>
      <EuiToolTip content={INSPECT_DOCUMENT(formattedTimestamp)} disableScreenReaderOutput>
        <EuiButtonIcon
          data-test-subj="syntheticsViewDocumentButton"
          iconType="inspect"
          aria-label={INSPECT_DOCUMENT(formattedTimestamp)}
          onClick={(evt: MouseEvent<HTMLButtonElement>) => {
            evt.stopPropagation();
            setIsFlyoutVisible(true);
          }}
        />
      </EuiToolTip>
      {isFlyoutVisible && (
        <EuiFlyout
          onClose={() => setIsFlyoutVisible(false)}
          ownFocus={true}
          onClick={(evt: MouseEvent) => {
            // needed to prevent propagation to the table row click
            evt.stopPropagation();
          }}
        >
          <EuiFlyoutHeader>
            <EuiTitle size="m">
              <h4>
                {INDEXED_AT} {formattedTimestamp}
              </h4>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {remoteDataViewError ? (
              <EuiCallOut
                announceOnMount
                color="danger"
                iconType="warning"
                title={i18n.translate(
                  'xpack.synthetics.monitorDetails.summary.viewDocument.error',
                  {
                    defaultMessage: 'Unable to load document from remote cluster',
                  }
                )}
              >
                {String(remoteDataViewError.message ?? remoteDataViewError)}
              </EuiCallOut>
            ) : dataView?.id && hit ? (
              <UnifiedDocViewer hit={hit} dataView={dataView} />
            ) : (
              <LoadingState />
            )}
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};

const INDEXED_AT = i18n.translate('xpack.synthetics.monitorDetails.summary.indexedAt', {
  defaultMessage: 'Indexed at',
});

export const INSPECT_DOCUMENT = (timestamp: string) =>
  i18n.translate('xpack.synthetics.monitorDetails.action.inspectDocument', {
    defaultMessage: 'Inspect document timestamped {timestamp}',
    values: { timestamp },
  });

// Builds an ad-hoc DataView targeting a CCS-prefixed pattern (e.g.
// `cluster1:synthetics-*`) so the unified doc viewer can fetch a ping that
// lives on a remote cluster. When `indexPattern` is undefined (the local
// case) we return undefined and let callers fall back to the local data view
// from `useSyntheticsDataView`.
const useRemoteDataView = (
  indexPattern: string | undefined
): { dataView: DataView | undefined; error: Error | undefined } => {
  const {
    services: { dataViews },
  } = useKibana<ClientPluginsStart>();

  const { data, error } = useFetcher<Promise<DataView | undefined>>(async () => {
    if (!indexPattern || !dataViews) {
      return undefined;
    }
    return dataViews.create({ title: indexPattern });
  }, [dataViews, indexPattern]);

  return { dataView: data, error };
};
