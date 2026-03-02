/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  EuiComboBox,
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiRange,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useEntityAnalyticsRoutes } from '../../../entity_analytics/api/api';
import type { CreateWatchlistRequestBodyInput } from '../../../../common/api/entity_analytics/watchlists/management/create.gen';
import { useKibana } from '../../../common/lib/kibana';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutTitle } from '../../shared/components/flyout_title';
import { WatchlistsFlyoutFooter } from './footer';
import { SUPPORTED_FILE_TYPES } from './constants';

export type WatchlistsFlyoutMode = 'create' | 'edit';

export interface WatchlistsFlyoutParams extends Record<string, unknown> {
  mode?: WatchlistsFlyoutMode;
  watchlistId?: string;
  watchlistName?: string;
  spaceId?: string;
}

export interface WatchlistsFlyoutExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'watchlists-flyout';
  params: WatchlistsFlyoutParams;
}

export const WatchlistsFlyoutPanel = ({
  mode = 'create',
  watchlistId,
  watchlistName,
  spaceId,
}: WatchlistsFlyoutParams) => {
  const isEditMode = mode === 'edit';
  const title = isEditMode
    ? i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.flyout.editTitle', {
        defaultMessage: 'Edit watchlist',
      })
    : i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.flyout.createTitle', {
        defaultMessage: 'Create watchlist',
      });

  const [watchlist, setWatchlist] = useState<CreateWatchlistRequestBodyInput>({
    name: watchlistName ?? '',
    description: '',
    riskModifier: 1.5,
    managed: false,
  });

  const setWatchlistField = <K extends keyof CreateWatchlistRequestBodyInput>(
    key: K,
    value: CreateWatchlistRequestBodyInput[K]
  ) => {
    setWatchlist((prev) => ({ ...prev, [key]: value }));
  };

  const { closeFlyout } = useExpandableFlyoutApi();
  const queryClient = useQueryClient();
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { createWatchlist } = useEntityAnalyticsRoutes();
  const createMutation = useMutation({
    mutationFn: () => createWatchlist(watchlist),
    onSuccess: async () => {
      toasts.addSuccess(
        i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.flyout.createSuccess', {
          defaultMessage: 'Watchlist created successfully',
        })
      );
      if (spaceId) {
        await queryClient.invalidateQueries({
          queryKey: ['watchlists-management-table', spaceId],
        });
      } else {
        await queryClient.invalidateQueries({ queryKey: ['watchlists-management-table'] });
      }
      closeFlyout();
    },
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.watchlists.flyout.createError',
          {
            defaultMessage: 'Failed to create watchlist',
          }
        ),
      });
    },
  });

  const isDisabled = !watchlist.name.trim() || !watchlist.description?.trim();

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} isRulePreview={false} />

      <FlyoutHeader data-test-subj="watchlist-flyout-header">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>
              <FlyoutTitle title={title} />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiSpacer size="m" />
        <EuiForm component="form" fullWidth>
          <EuiFormRow label="Name">
            <EuiFieldText
              name="Enter Watchlist Name"
              value={watchlist.name}
              onChange={(e) => setWatchlistField('name', e.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow
            label="Description"
            labelAppend={
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.watchlists.flyout.descriptionOptional"
                  defaultMessage="optional"
                />
              </EuiText>
            }
          >
            <EuiFieldText
              name="Enter Watchlist Description"
              value={watchlist.description}
              onChange={(e) => setWatchlistField('description', e.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow label="Risk Score Weighting">
            <EuiRange
              min={0}
              max={2}
              step={0.5}
              showTicks
              showInput
              value={watchlist.riskModifier}
              onChange={(e) => setWatchlistField('riskModifier', Number(e.currentTarget.value))}
            />
          </EuiFormRow>
          <EuiFormRow label="File upload">
            <EuiFilePicker
              data-test-subj="upload-watchlist-file"
              accept={SUPPORTED_FILE_TYPES.join(',')}
              fullWidth
              onChange={() => {}} // TODO use fileUploader from privmon
              isInvalid={false}
              isLoading={false}
              aria-label={i18n.translate(
                'xpack.securitySolution.entityAnalytics.watchlists.flyout.filePicker.AriaLabel',
                {
                  defaultMessage: 'Watchlist file picker',
                }
              )}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem>
              <EuiHorizontalRule margin="none" size="full" css={{ height: 2 }} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.watchlists.flyout.orSeparator"
                  defaultMessage="OR"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiHorizontalRule margin="none" css={{ height: 2 }} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFormRow
            label="Index Patterns"
            helpText={i18n.translate(
              'xpack.securitySolution.entityAnalytics.watchlists.flyout.indexPatternsHelpText',
              {
                defaultMessage:
                  'Enter the pattern of Elasticsearch indicies where you would like this rule to run. By default, these will include index patterns defined in Security Solutions advanced settings. ',
              }
            )}
          >
            <EuiComboBox
              placeholder="Select or create index patterns"
              selectedOptions={[{ label: 'one', value: 'one' }]}
              options={[
                { label: 'one', value: 'one' },
                { label: 'two', value: 'two' },
                { label: 'three', value: 'three' },
              ]}
              onChange={() => {}}
              isClearable
              fullWidth
              aria-label={i18n.translate(
                'xpack.securitySolution.entityAnalytics.watchlists.flyout.indexSelector.AriaLabel',
                {
                  defaultMessage: 'Watchlist index selector',
                }
              )}
            />
          </EuiFormRow>
        </EuiForm>
      </FlyoutHeader>
      <EuiFlyoutBody />
      <WatchlistsFlyoutFooter
        onSave={() => createMutation.mutate()}
        isLoading={createMutation.isLoading}
        isDisabled={isDisabled}
      />
    </>
  );
};
