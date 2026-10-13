/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiButton,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiFlyoutSize } from '@elastic/eui/src/components/flyout/flyout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useArtifactActionsDisabled, useGetArtifact } from '../../../hooks/artifacts';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { useToasts } from '../../../../common/lib/kibana';
import type { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import type { XOR } from '../../../../../common/utility_types';
import { ManagementPageLoader } from '../../management_page_loader';
import { ARTIFACT_ENABLE_DISABLE_ACTION_LABELS } from '../hooks/use_with_artifact_enable_disable';
import type { ArtifactViewModeComponentProps } from '../types';
import {
  ARTIFACT_ENABLED_SWITCH_LABELS,
  ArtifactEnabledSwitch,
  type ArtifactEnabledSwitchProps,
} from './artifact_enabled_switch';
import {
  ContextMenuItemNavByRouter,
  type ContextMenuItemNavByRouterProps,
} from '../../context_menu_with_router_support';
import { ArtifactOperatingSystemBadges } from './artifact_os_badges';
import { ArtifactViewPolicyAssignment } from './artifact_view_policy_assignment';
import { ARTIFACT_CARD_ACTION_LABELS } from '../translations';

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
  viewFlyoutPolicyAssignmentTitle: i18n.translate(
    'xpack.securitySolution.artifactListPage.viewFlyoutPolicyAssignmentTitle',
    { defaultMessage: 'Policy assignment' }
  ),
  viewFlyoutPolicyAssignmentGlobalLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.viewFlyoutPolicyAssignmentGlobalLabel',
    { defaultMessage: 'Applied globally.' }
  ),
  viewFlyoutPolicyAssignmentNoneLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.viewFlyoutPolicyAssignmentNoneLabel',
    { defaultMessage: 'Applied to 0 policies.' }
  ),
  viewFlyoutTakeActionButtonLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.viewFlyoutTakeActionButtonLabel',
    { defaultMessage: 'Take action' }
  ),
  viewFlyoutAriaLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.viewFlyoutAriaLabel',
    { defaultMessage: 'Artifact details' }
  ),
  viewFlyoutItemLoadFailure: (errorMessage: string): string =>
    i18n.translate('xpack.securitySolution.artifactListPage.viewFlyoutItemLoadFailure', {
      defaultMessage: 'Failed to retrieve artifact. Reason: {errorMessage}',
      values: { errorMessage },
    }),
});

type ArtifactViewFlyoutLabels = typeof ARTIFACT_VIEW_FLYOUT_LABELS &
  ArtifactEnabledSwitchProps['labels'] &
  typeof ARTIFACT_CARD_ACTION_LABELS;

const isNotFoundError = (error: IHttpFetchError<Error>): boolean => {
  const httpError = error as IHttpFetchError<{ statusCode?: number }>;
  return httpError.response?.status === 404 || httpError.body?.statusCode === 404;
};

export type ArtifactViewFlyoutTakeAction = (action: {
  type: 'edit' | 'delete';
  item: ExceptionListItemSchema;
}) => void;

interface ArtifactViewFlyoutBaseProps {
  apiClient: ExceptionsListApiClient;
  /** Id of the artifact to load. The list page only opens this flyout when the URL has one. */
  itemId: string;
  /** Matches the create/edit flyout size for the same artifact page. */
  size?: EuiFlyoutSize;
  /** Any label overrides */
  labels?: Partial<ArtifactViewFlyoutLabels>;
  /** Renders the artifact-specific definition. Receives the full artifact item. */
  ViewModeComponent: React.ComponentType<ArtifactViewModeComponentProps>;
  /** When false, no edit actions can be taken. Defaults to true. */
  allowCardEditAction?: boolean;
  /** When false, the footer omits Delete. Defaults to true. */
  allowCardDeleteAction?: boolean;
  /** Opens edit or delete the same way the simple table does. */
  onTakeAction?: ArtifactViewFlyoutTakeAction;
  onClose: () => void;
  'data-test-subj'?: string;
}

interface ArtifactViewFlyoutWithoutEnabledSwitchProps {
  /** When omitted, the info block does not include the enable/disable switch. */
  showEnabledSwitch?: false;
}

interface ArtifactViewFlyoutWithEnabledSwitchProps {
  /**
   * When true, the info block leads with the same enable/disable switch as the simple table.
   */
  showEnabledSwitch: true;
  /** Reloads the list after a successful enable/disable or a 409 conflict. */
  onEnabledChangeRefresh: () => Promise<void>;
}

export type ArtifactViewFlyoutProps = ArtifactViewFlyoutBaseProps &
  XOR<ArtifactViewFlyoutWithoutEnabledSwitchProps, ArtifactViewFlyoutWithEnabledSwitchProps>;

export const ArtifactViewFlyout = memo<ArtifactViewFlyoutProps>(
  ({
    apiClient,
    itemId,
    size,
    labels: _labels,
    ViewModeComponent,
    showEnabledSwitch = false,
    allowCardEditAction = true,
    allowCardDeleteAction = true,
    onTakeAction,
    onEnabledChangeRefresh,
    onClose,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const toasts = useToasts();
    const titleId = useGeneratedHtmlId({ prefix: 'artifactViewFlyoutTitle' });
    const labels: ArtifactViewFlyoutLabels = useMemo(
      () => ({
        ...ARTIFACT_VIEW_FLYOUT_LABELS,
        ...ARTIFACT_ENABLED_SWITCH_LABELS,
        ...ARTIFACT_ENABLE_DISABLE_ACTION_LABELS,
        ...ARTIFACT_CARD_ACTION_LABELS,
        ..._labels,
      }),
      [_labels]
    );
    const maskProps = useMemo(
      () => ({ style: `z-index: ${(euiTheme.levels.flyout as number) + 4}` }), // we need this flyout to be above the timeline flyout (which has a z-index of 1003)
      [euiTheme.levels.flyout]
    );

    const {
      data: item,
      error,
      refetch: refetchArtifact,
    } = useGetArtifact(apiClient, itemId, undefined, {
      enabled: Boolean(itemId),
      retry: false,
    });

    const handleEnabledChangeRefresh = useCallback(async () => {
      await Promise.all([refetchArtifact(), onEnabledChangeRefresh?.()]);
    }, [onEnabledChangeRefresh, refetchArtifact]);

    useEffect(() => {
      if (!error) {
        return;
      }

      toasts.addWarning(labels.viewFlyoutItemLoadFailure(error.body?.message || error.message));

      // A refetch keeps the previous item. Close when nothing loaded, or when the artifact is gone.
      if (!item || isNotFoundError(error)) {
        onClose();
      }
    }, [error, item, labels, onClose, toasts]);

    return (
      <EuiFlyout
        session="never"
        onClose={onClose}
        data-test-subj={dataTestSubj}
        aria-labelledby={item ? titleId : undefined}
        aria-label={item ? undefined : labels.viewFlyoutAriaLabel}
        size={size}
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
              showEnabledSwitch={showEnabledSwitch}
              allowCardEditAction={allowCardEditAction}
              onEnabledChangeRefresh={handleEnabledChangeRefresh}
              ViewModeComponent={ViewModeComponent}
              data-test-subj={dataTestSubj}
            />
          )}
        </EuiFlyoutBody>
        {item && (allowCardEditAction || allowCardDeleteAction) && (
          <EuiFlyoutFooter>
            <ArtifactViewFlyoutTakeAction
              item={item}
              labels={labels}
              allowCardEditAction={allowCardEditAction}
              allowCardDeleteAction={allowCardDeleteAction}
              onTakeAction={onTakeAction}
              data-test-subj={dataTestSubj}
            />
          </EuiFlyoutFooter>
        )}
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
  showEnabledSwitch: boolean;
  allowCardEditAction: boolean;
  onEnabledChangeRefresh?: () => Promise<void>;
  ViewModeComponent: React.ComponentType<ArtifactViewModeComponentProps>;
  'data-test-subj'?: string;
}>(
  ({
    item,
    apiClient,
    labels,
    showEnabledSwitch,
    allowCardEditAction,
    onEnabledChangeRefresh,
    ViewModeComponent,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const description = item.description.trim() ? item.description : getEmptyValue();

    const infoBlockCss = css`
      display: grid;
      grid-template-columns: ${showEnabledSwitch
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
          {showEnabledSwitch && (
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

        <EuiSpacer size="l" />
        <EuiTitle size="xs">
          <h3 data-test-subj={getTestId('policyAssignmentTitle')}>
            {labels.viewFlyoutPolicyAssignmentTitle}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <ArtifactViewPolicyAssignment
          item={item}
          labels={labels}
          data-test-subj={getTestId('policyAssignment')}
        />
      </>
    );
  }
);
ArtifactViewFlyoutBody.displayName = 'ArtifactViewFlyoutBody';

const ArtifactViewFlyoutTakeAction = memo<{
  item: ExceptionListItemSchema;
  labels: ArtifactViewFlyoutLabels;
  allowCardEditAction: boolean;
  allowCardDeleteAction: boolean;
  onTakeAction?: ArtifactViewFlyoutTakeAction;
  'data-test-subj'?: string;
}>(
  ({
    item,
    labels,
    allowCardEditAction,
    allowCardDeleteAction,
    onTakeAction,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { isDisabled, disabledTooltip } = useArtifactActionsDisabled(item);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);
    const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);

    const actionItems = useMemo<ContextMenuItemNavByRouterProps[]>(() => {
      const items: ContextMenuItemNavByRouterProps[] = [];

      if (allowCardEditAction && labels.cardActionEditLabel) {
        items.push({
          icon: 'controls',
          onClick: () => onTakeAction?.({ type: 'edit', item }),
          'data-test-subj': getTestId('cardEditAction'),
          children: labels.cardActionEditLabel,
        });
      }

      if (allowCardDeleteAction && labels.cardActionDeleteLabel) {
        items.push({
          icon: 'trash',
          onClick: () => onTakeAction?.({ type: 'delete', item }),
          'data-test-subj': getTestId('cardDeleteAction'),
          children: labels.cardActionDeleteLabel,
        });
      }

      return items;
    }, [
      allowCardDeleteAction,
      allowCardEditAction,
      getTestId,
      item,
      labels.cardActionDeleteLabel,
      labels.cardActionEditLabel,
      onTakeAction,
    ]);

    const menuItems = useMemo(
      () =>
        actionItems.map((action) => (
          <ContextMenuItemNavByRouter
            {...action}
            key={action['data-test-subj']}
            onClick={(event) => {
              closePopover();
              return action.onClick?.(event);
            }}
          />
        )),
      [actionItems, closePopover]
    );

    const button = (
      <EuiButton
        fill
        iconSide="right"
        iconType="chevronSingleDown"
        onClick={togglePopover}
        isDisabled={isDisabled}
        data-test-subj={getTestId('takeActionButton')}
      >
        {labels.viewFlyoutTakeActionButtonLabel}
      </EuiButton>
    );

    return (
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              isDisabled && disabledTooltip ? (
                <EuiToolTip content={disabledTooltip}>{button}</EuiToolTip>
              ) : (
                button
              )
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="upRight"
            repositionOnScroll
            aria-label={labels.viewFlyoutTakeActionButtonLabel}
          >
            <EuiContextMenuPanel items={menuItems} data-test-subj={getTestId('takeActionMenu')} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
ArtifactViewFlyoutTakeAction.displayName = 'ArtifactViewFlyoutTakeAction';
