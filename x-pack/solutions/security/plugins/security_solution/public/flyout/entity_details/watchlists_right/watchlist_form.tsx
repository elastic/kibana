/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiComboBox,
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiRange,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { CreateWatchlistRequestBodyInput } from '../../../../common/api/entity_analytics/watchlists/management/create.gen';
import { SUPPORTED_FILE_TYPES } from './constants';

export interface WatchlistFormProps {
  watchlist: CreateWatchlistRequestBodyInput;
  onFieldChange: <K extends keyof CreateWatchlistRequestBodyInput>(
    key: K,
    value: CreateWatchlistRequestBodyInput[K]
  ) => void;
}

export const WatchlistForm = ({ watchlist, onFieldChange }: WatchlistFormProps) => {
  return (
    <EuiForm component="form" fullWidth>
      <EuiFormRow label="Name">
        <EuiFieldText
          name="Enter Watchlist Name"
          value={watchlist.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
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
          onChange={(e) => onFieldChange('description', e.target.value)}
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
          onChange={(e) => onFieldChange('riskModifier', Number(e.currentTarget.value))}
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
  );
};
