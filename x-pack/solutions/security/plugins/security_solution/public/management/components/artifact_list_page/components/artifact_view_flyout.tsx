/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useUrlParams } from '../../../hooks/use_url_params';
import { useGetArtifact } from '../../../hooks/artifacts';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { useToasts } from '../../../../common/lib/kibana';
import type { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import type { XOR } from '../../../../../common/utility_types';
import { ManagementPageLoader } from '../../management_page_loader';
import { ARTIFACT_ENABLE_DISABLE_ACTION_LABELS } from '../hooks/use_with_artifact_enable_disable';
import type { ArtifactListPageUrlParams, ArtifactViewModeComponentProps } from '../types';
import {
  ARTIFACT_ENABLED_SWITCH_LABELS,
  ArtifactEnabledSwitch,
  type ArtifactEnabledSwitchProps,
} from './artifact_enabled_switch';
import { ArtifactOperatingSystemBadges } from './artifact_os_badges';

export const ARTIFACT_VIEW_FLYOUT_LABELS = Object.freeze({
  viewFlyoutLastUpdatedFieldLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.viewFlyoutLastUpdatedFieldLabel',
    { defaultMessage: 'Last updated' }
  ),
  viewFlyoutUpdatedByLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.viewFlyoutUpdatedByLabel',
    { defaultMessage: 'Updated by' }
  ),
  viewFlyoutDescriptionTitle: i18n.translate(
    'xpack.securitySolution.artifactListPage.viewFlyoutDescriptionTitle',
    { defaultMessage: 'Description' }
  ),
  viewFlyoutDefinitionTitle: i18n.translate(
    'xpack.securitySolution.artifactListPage.viewFlyoutDefinitionTitle',
    { defaultMessage: 'Definition' }
  ),
  viewFlyoutEmptyDescription: i18n.translate(
    'xpack.securitySolution.artifactListPage.viewFlyoutEmptyDescription',
    { defaultMessage: '-' }
  ),
  viewFlyoutItemLoadFailure: (errorMessage: string): string =>
    i18n.translate('xpack.securitySolution.artifactListPage.viewFlyoutItemLoadFailure', {
      defaultMessage: 'Failed to retrieve artifact. Reason: {errorMessage}',
      values: { errorMessage },
    }),
});

type ArtifactViewFlyoutLabels = typeof ARTIFACT_VIEW_FLYOUT_LABELS &
  ArtifactEnabledSwitchProps['labels'];

interface ArtifactViewFlyoutBaseProps {
  apiClient: ExceptionsListApiClient;
  /** Any label overrides */
  labels?: Partial<ArtifactViewFlyoutLabels>;
  /** Renders the artifact-specific definition. Receives the full artifact item. */
  ViewModeComponent: React.ComponentType<ArtifactViewModeComponentProps>;
  onClose: () => void;
  'data-test-subj'?: string;
}

interface ArtifactViewFlyoutWithoutEnabledColumnProps {
  /** When omitted, the info block does not include the enable/disable switch. */
  showEnabledColumn?: false;
}

interface ArtifactViewFlyoutWithEnabledColumnProps {
  /**
   * When true, the info block leads with the same enable/disable switch as the simple table.
   */
  showEnabledColumn: true;
  /** When false, the enabled switch is shown read-only. */
  allowCardEditAction: boolean;
  /** Reloads the list after a successful enable/disable or a 409 conflict. */
  onEnabledChangeRefresh: () => Promise<void>;
}

export type ArtifactViewFlyoutProps = ArtifactViewFlyoutBaseProps &
  XOR<ArtifactViewFlyoutWithoutEnabledColumnProps, ArtifactViewFlyoutWithEnabledColumnProps>;

export const ArtifactViewFlyout = memo<ArtifactViewFlyoutProps>(
  ({
    apiClient,
    labels: _labels,
    ViewModeComponent,
    showEnabledColumn = false,
    allowCardEditAction = true,
    onEnabledChangeRefresh,
    onClose,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const toasts = useToasts();
    const { urlParams } = useUrlParams<ArtifactListPageUrlParams>();
    const titleId = useGeneratedHtmlId({ prefix: 'artifactViewFlyoutTitle' });
    const labels: ArtifactViewFlyoutLabels = useMemo(
      () => ({
        ...ARTIFACT_VIEW_FLYOUT_LABELS,
        ...ARTIFACT_ENABLED_SWITCH_LABELS,
        ...ARTIFACT_ENABLE_DISABLE_ACTION_LABELS,
        ..._labels,
      }),
      [_labels]
    );
    const maskProps = useMemo(
      () => ({ style: `z-index: ${(euiTheme.levels.flyout as number) + 4}` }),
      [euiTheme.levels.flyout]
    );

    const {
      data: item,
      error,
      refetch: refetchArtifact,
    } = useGetArtifact(apiClient, urlParams.itemId, undefined, {
      enabled: Boolean(urlParams.itemId),
      retry: false,
    });

    const handleEnabledChangeRefresh = useCallback(async () => {
      await Promise.all([refetchArtifact(), onEnabledChangeRefresh?.()]);
    }, [onEnabledChangeRefresh, refetchArtifact]);

    useEffect(() => {
      // Refetch keeps the previous item and still sets error. Only a failed initial load should close.
      if (!error || item) {
        return;
      }

      toasts.addWarning(labels.viewFlyoutItemLoadFailure(error.body?.message || error.message));
      onClose();
    }, [error, item, labels, onClose, toasts]);

    return (
      <EuiFlyout
        session="never"
        onClose={onClose}
        data-test-subj={dataTestSubj}
        aria-labelledby={item ? titleId : undefined}
        aria-label={
          item
            ? undefined
            : i18n.translate('xpack.securitySolution.artifactListPage.viewFlyoutAriaLabel', {
                defaultMessage: 'Artifact details',
              })
        }
        maskProps={maskProps}
      >
        <EuiFlyoutHeader hasBorder>
          {item && (
            <ArtifactViewFlyoutHeader item={item} titleId={titleId} data-test-subj={dataTestSubj} />
          )}
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {!item && !error && <ManagementPageLoader data-test-subj={getTestId('loader')} />}
          {item && (
            <ArtifactViewFlyoutBody
              item={item}
              apiClient={apiClient}
              labels={labels}
              showEnabledColumn={showEnabledColumn}
              allowCardEditAction={allowCardEditAction}
              onEnabledChangeRefresh={handleEnabledChangeRefresh}
              ViewModeComponent={ViewModeComponent}
              data-test-subj={dataTestSubj}
            />
          )}
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
);
ArtifactViewFlyout.displayName = 'ArtifactViewFlyout';

const ArtifactViewFlyoutHeader = memo<{
  item: ExceptionListItemSchema;
  titleId: string;
  'data-test-subj'?: string;
}>(({ item, titleId, 'data-test-subj': dataTestSubj }) => {
  const getTestId = useTestIdGenerator(dataTestSubj);

  return (
    <>
      <EuiToolTip content={item.name} anchorClassName="eui-textTruncate">
        <EuiTitle size="m">
          <h2 id={titleId} className="eui-textTruncate" data-test-subj={getTestId('title')}>
            {item.name}
          </h2>
        </EuiTitle>
      </EuiToolTip>

      <EuiSpacer size="s" />

      <EuiText size="s" color="subdued" data-test-subj={getTestId('lastUpdated')}>
        <FormattedMessage
          id="xpack.securitySolution.artifactListPage.viewFlyoutLastUpdatedLabel"
          defaultMessage="Last updated: {date}"
          values={{
            date: (
              <FormattedDate
                fieldName={ARTIFACT_VIEW_FLYOUT_LABELS.viewFlyoutLastUpdatedFieldLabel}
                value={item.updated_at}
              />
            ),
          }}
        />
      </EuiText>

      <EuiSpacer size="s" />

      <ArtifactOperatingSystemBadges osTypes={item.os_types} data-test-subj={getTestId('os')} />
    </>
  );
});
ArtifactViewFlyoutHeader.displayName = 'ArtifactViewFlyoutHeader';

const ArtifactViewFlyoutBody = memo<{
  item: ExceptionListItemSchema;
  apiClient: ExceptionsListApiClient;
  labels: ArtifactViewFlyoutLabels;
  showEnabledColumn: boolean;
  allowCardEditAction: boolean;
  onEnabledChangeRefresh?: () => Promise<void>;
  ViewModeComponent: React.ComponentType<ArtifactViewModeComponentProps>;
  'data-test-subj'?: string;
}>(
  ({
    item,
    apiClient,
    labels,
    showEnabledColumn,
    allowCardEditAction,
    onEnabledChangeRefresh,
    ViewModeComponent,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const description = item.description.trim()
      ? item.description
      : labels.viewFlyoutEmptyDescription;

    const infoBlockCss = css`
      display: grid;
      grid-template-columns: ${showEnabledColumn
        ? 'minmax(0, 1fr) auto minmax(0, 1fr)'
        : 'repeat(2, minmax(0, 1fr))'};
      column-gap: ${euiTheme.size.s};
      padding: ${euiTheme.size.m};
      border-radius: ${euiTheme.size.xs};
    `;
    // Stretches the row inside the panel padding, so the line stays off the outer border.
    const infoBlockDividerCss = css`
      width: ${euiTheme.border.width.thin};
      align-self: stretch;
      background-color: ${euiTheme.border.color};
    `;

    return (
      <>
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="none"
          css={infoBlockCss}
          data-test-subj={getTestId('infoBlock')}
        >
          {showEnabledColumn && (
            <>
              <div>
                <EuiText size="xs" color="subdued" data-test-subj={getTestId('enabledLabel')}>
                  {labels.tableColumnEnabledLabel}
                </EuiText>
                <EuiSpacer size="s" />
                <ArtifactEnabledSwitch
                  item={item}
                  apiClient={apiClient}
                  labels={labels}
                  isReadOnly={!allowCardEditAction}
                  onRefresh={onEnabledChangeRefresh}
                  data-test-subj={getTestId('enabledSwitch')}
                />
              </div>
              <div
                aria-hidden={true}
                css={infoBlockDividerCss}
                data-test-subj={getTestId('infoBlockDivider')}
              />
            </>
          )}
          <div>
            <EuiText size="xs" color="subdued">
              {labels.viewFlyoutUpdatedByLabel}
            </EuiText>
            <EuiSpacer size="s" />
            <EuiAvatar
              name={item.updated_by}
              size="s"
              data-test-subj={getTestId('updatedByAvatar')}
            />
          </div>
        </EuiPanel>

        <EuiSpacer size="l" />
        <EuiTitle size="xs">
          <h3 data-test-subj={getTestId('descriptionTitle')}>
            {labels.viewFlyoutDescriptionTitle}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" data-test-subj={getTestId('description')}>
          {description}
        </EuiText>

        <EuiSpacer size="l" />
        <EuiTitle size="xs">
          <h3 data-test-subj={getTestId('definitionTitle')}>{labels.viewFlyoutDefinitionTitle}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <ViewModeComponent item={item} />
      </>
    );
  }
);
ArtifactViewFlyoutBody.displayName = 'ArtifactViewFlyoutBody';
