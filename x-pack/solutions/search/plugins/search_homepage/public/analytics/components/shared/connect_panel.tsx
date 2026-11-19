/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DEFAULT_SAMPLE_DATASET } from '../../constants';
import { getFeaturedAnalyticsEntries } from '../../sources';
import type { AnalyticsLinks, AnalyticsSampleData, AnalyticsSourceList } from '../../types';
import { AddSourceButton } from './add_source_button';
import type { AnalyticsPageId } from './page_ids';
import { getPageTelemetryId, getPageTestSubj } from './page_ids';
import { SourceTile } from './source_tile';
import { SourcesFlyout } from './sources_flyout';
import { TileButton } from './tile_button';

interface ConnectPanelProps {
  page: AnalyticsPageId;
  /** Omit when the surrounding view already has a heading for this task. */
  title?: string;
  links: Pick<
    AnalyticsLinks,
    'canUseIntegrations' | 'isSourceAvailable' | 'openSource' | 'browseIntegrations'
  >;
  sampleData: AnalyticsSampleData;
  /** Called once the sample events are in the cluster. */
  onSampleInstalled: () => void;
}

/**
 * The one task while the deployment is empty: the featured ways to add data, the rest behind one
 * control, and sample events. It serves search and analytics alike; the event sources are one
 * featured choice, which lists them in a flyout.
 */
export const ConnectPanel = ({
  page,
  title,
  links,
  sampleData,
  onSampleInstalled,
}: ConnectPanelProps): React.JSX.Element => {
  const { isSourceAvailable } = links;
  const featuredEntries = useMemo(
    () =>
      getFeaturedAnalyticsEntries().filter(
        (entry) => entry.kind !== 'source' || isSourceAvailable(entry.source)
      ),
    [isSourceAvailable]
  );
  const [openSourceList, setOpenSourceList] = useState<AnalyticsSourceList>();
  const sourceListOpenerRef = useRef<HTMLButtonElement | null>(null);
  const getSourceListOpener = useCallback(
    (): HTMLElement | null => sourceListOpenerRef.current,
    []
  );

  const closeSourceList = (): void => {
    setOpenSourceList(undefined);
    sourceListOpenerRef.current?.focus();
  };

  // A failed install is reported by the sample data hook.
  const onTrySampleEvents = async (): Promise<void> => {
    const isInstalled = await sampleData.install(DEFAULT_SAMPLE_DATASET);
    if (isInstalled) {
      onSampleInstalled();
    }
  };

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj={getPageTestSubj(page, 'ConnectPanel')}>
      {title !== undefined && (
        <>
          <EuiTitle size="s">
            <h2>{title}</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiFlexGrid columns={featuredEntries.length > 3 ? 4 : 3} gutterSize="m">
        {featuredEntries.map((entry) =>
          entry.kind === 'source' ? (
            <EuiFlexItem key={entry.source.id}>
              <SourceTile
                page={page}
                placement="Featured"
                source={entry.source}
                canUseIntegrations={links.canUseIntegrations}
                onSelect={links.openSource}
              />
            </EuiFlexItem>
          ) : (
            <EuiFlexItem key={entry.list.id}>
              <TileButton
                page={page}
                placement="Featured"
                id={entry.list.id}
                title={entry.list.title}
                description={entry.list.description}
                iconType={entry.list.iconType}
                opensDialog
                onClick={(button) => {
                  sourceListOpenerRef.current = button;
                  setOpenSourceList(entry.list);
                }}
              />
            </EuiFlexItem>
          )
        )}
      </EuiFlexGrid>
      {openSourceList !== undefined && (
        <SourcesFlyout
          page={page}
          audience={openSourceList.audience}
          links={links}
          getOpener={getSourceListOpener}
          onClose={closeSourceList}
        />
      )}
      <EuiSpacer size="m" />
      <AddSourceButton
        page={page}
        name="MoreSources"
        emphasis="medium"
        audience="all"
        links={links}
        label={i18n.translate('xpack.searchHomepage.analytics.connectPanel.moreSourcesButton', {
          defaultMessage: 'More sources',
        })}
      />
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.searchHomepage.analytics.connectPanel.samplePrompt', {
                defaultMessage: 'No data of your own yet?',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="flask"
            onClick={onTrySampleEvents}
            isLoading={sampleData.isInstalling}
            data-test-subj={getPageTestSubj(page, 'TrySampleEvents')}
            data-telemetry-id={getPageTelemetryId(page, 'trySampleEvents')}
          >
            {sampleData.isInstalling
              ? i18n.translate(
                  'xpack.searchHomepage.analytics.connectPanel.sampleInstallingButton',
                  { defaultMessage: 'Installing sample events…' }
                )
              : i18n.translate('xpack.searchHomepage.analytics.connectPanel.sampleButton', {
                  defaultMessage: 'Try with sample web events',
                })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
