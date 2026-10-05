/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo } from 'react';
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
import { ManagementPageLoader } from '../../management_page_loader';
import type { ArtifactListPageUrlParams } from '../types';
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

export interface ArtifactViewFlyoutProps {
  apiClient: ExceptionsListApiClient;
  /** Any label overrides */
  labels?: Partial<typeof ARTIFACT_VIEW_FLYOUT_LABELS>;
  onClose: () => void;
  'data-test-subj'?: string;
}

export const ArtifactViewFlyout = memo<ArtifactViewFlyoutProps>(
  ({ apiClient, labels: _labels, onClose, 'data-test-subj': dataTestSubj }) => {
    const { euiTheme } = useEuiTheme();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const toasts = useToasts();
    const { urlParams } = useUrlParams<ArtifactListPageUrlParams>();
    const titleId = useGeneratedHtmlId({ prefix: 'artifactViewFlyoutTitle' });
    const labels = useMemo(
      () => ({
        ...ARTIFACT_VIEW_FLYOUT_LABELS,
        ..._labels,
      }),
      [_labels]
    );
    const maskProps = useMemo(
      () => ({ style: `z-index: ${(euiTheme.levels.flyout as number) + 4}` }),
      [euiTheme.levels.flyout]
    );

    const { data: item, error } = useGetArtifact(apiClient, urlParams.itemId, undefined, {
      enabled: Boolean(urlParams.itemId),
      retry: false,
    });

    useEffect(() => {
      if (!error) {
        return;
      }

      toasts.addWarning(labels.viewFlyoutItemLoadFailure(error.body?.message || error.message));
      onClose();
    }, [error, labels, onClose, toasts]);

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
            <ArtifactViewFlyoutBody item={item} labels={labels} data-test-subj={dataTestSubj} />
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
  labels: typeof ARTIFACT_VIEW_FLYOUT_LABELS;
  'data-test-subj'?: string;
}>(({ item, labels, 'data-test-subj': dataTestSubj }) => {
  const { euiTheme } = useEuiTheme();
  const getTestId = useTestIdGenerator(dataTestSubj);
  const description = item.description.trim()
    ? item.description
    : labels.viewFlyoutEmptyDescription;

  const infoBlockCss = css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.m};
    border-radius: ${euiTheme.size.xs};
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
        <h3 data-test-subj={getTestId('descriptionTitle')}>{labels.viewFlyoutDescriptionTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" data-test-subj={getTestId('description')}>
        {description}
      </EuiText>

      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h3 data-test-subj={getTestId('definitionTitle')}>{labels.viewFlyoutDefinitionTitle}</h3>
      </EuiTitle>
    </>
  );
});
ArtifactViewFlyoutBody.displayName = 'ArtifactViewFlyoutBody';
