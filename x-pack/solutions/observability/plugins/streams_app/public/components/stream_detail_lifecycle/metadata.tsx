/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';
import { LocatorPublic } from '@kbn/share-plugin/common';
import {
  IngestStreamGetResponse,
  isDisabledLifecycle,
  isDslLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
  isWiredStreamGetResponse,
} from '@kbn/streams-schema';
import React, { ReactNode } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import {
  EuiBadge,
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LifecycleEditAction } from './modal';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

export function RetentionMetadata({
  definition,
  ilmLocator,
  lifecycleActions,
  openEditModal,
}: {
  definition: IngestStreamGetResponse;
  ilmLocator?: LocatorPublic<IlmLocatorParams>;
  lifecycleActions: Array<{ name: string; action: LifecycleEditAction }>;
  openEditModal: (action: LifecycleEditAction) => void;
}) {
  const [isMenuOpen, { toggle: toggleMenu, off: closeMenu }] = useBoolean(false);
  const router = useStreamsAppRouter();

  const lifecycle = definition.effective_lifecycle;

  const contextualMenu =
    lifecycleActions.length === 0 ? null : (
      <EuiPopover
        button={
          <EuiButton
            data-test-subj="streamsAppRetentionMetadataEditDataRetentionButton"
            size="s"
            fullWidth
            onClick={toggleMenu}
          >
            {i18n.translate('xpack.streams.entityDetailViewWithoutParams.editDataRetention', {
              defaultMessage: 'Edit data retention',
            })}
          </EuiButton>
        }
        isOpen={isMenuOpen}
        closePopover={closeMenu}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          items={lifecycleActions.map(({ name, action }) => (
            <EuiContextMenuItem
              key={action}
              onClick={() => {
                closeMenu();
                openEditModal(action);
              }}
            >
              {name}
            </EuiContextMenuItem>
          ))}
        />
      </EuiPopover>
    );

  const ilmLink = isIlmLifecycle(lifecycle) ? (
    <EuiBadge color="hollow">
      <EuiLink
        target="_blank"
        data-test-subj="streamsAppLifecycleBadgeIlmPolicyNameLink"
        href={ilmLocator?.getRedirectUrl({
          page: 'policy_edit',
          policyName: lifecycle.ilm.policy,
        })}
      >
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.ilmBadgeLabel', {
          defaultMessage: 'ILM Policy: {name}',
          values: { name: lifecycle.ilm.policy },
        })}
      </EuiLink>
    </EuiBadge>
  ) : null;

  const lifecycleOrigin = isInheritLifecycle(definition.stream.ingest.lifecycle) ? (
    <EuiText>
      {i18n.translate('xpack.streams.streamDetailLifecycle.inheritedFrom', {
        defaultMessage: 'Inherited from',
      })}{' '}
      {isWiredStreamGetResponse(definition) ? (
        <EuiLink
          data-test-subj="streamsAppRetentionMetadataLink"
          target="_blank"
          href={router.link('/{key}/{tab}', {
            path: {
              key: definition.effective_lifecycle.from,
              tab: 'overview',
            },
          })}
        >
          [{definition.effective_lifecycle.from}]
        </EuiLink>
      ) : (
        i18n.translate('xpack.streams.streamDetailLifecycle.localOverride', {
          defaultMessage: 'the underlying data stream',
        })
      )}
    </EuiText>
  ) : (
    i18n.translate('xpack.streams.streamDetailLifecycle.localOverride', {
      defaultMessage: 'Local override',
    })
  );

  return (
    <EuiPanel hasBorder={false} hasShadow={false}>
      <MetadataRow
        metadata={i18n.translate('xpack.streams.streamDetailLifecycle.retentionPeriodLabel', {
          defaultMessage: 'Retention period',
        })}
        value={
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color={isDisabledLifecycle(lifecycle) ? 'default' : 'accent'}>
                {isDslLifecycle(lifecycle)
                  ? lifecycle.dsl.data_retention ?? '∞'
                  : isIlmLifecycle(lifecycle)
                  ? i18n.translate('xpack.streams.streamDetailLifecycle.policyBased', {
                      defaultMessage: 'Policy-based',
                    })
                  : i18n.translate('xpack.streams.streamDetailLifecycle.policyDisabled', {
                      defaultMessage: 'Disabled',
                    })}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        button={contextualMenu}
      />
      <EuiHorizontalRule margin="m" />
      <MetadataRow
        metadata={i18n.translate('xpack.streams.streamDetailLifecycle.retentionSourceLabel', {
          defaultMessage: 'Source',
        })}
        value={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {ilmLink ? <EuiFlexItem grow={false}>{ilmLink}</EuiFlexItem> : null}
            <EuiFlexItem grow={false}>{lifecycleOrigin}</EuiFlexItem>
          </EuiFlexGroup>
        }
      />
    </EuiPanel>
  );
}

function MetadataRow({
  metadata,
  value,
  button,
}: {
  metadata: string;
  value: ReactNode;
  action?: string;
  button?: ReactNode;
}) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xl" responsive={false}>
      <EuiFlexItem grow={1}>
        <EuiText>
          <b>{metadata}</b>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={4}>{value}</EuiFlexItem>
      <EuiFlexItem grow={1}>{button}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
