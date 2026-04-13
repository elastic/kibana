/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiRange,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { canUpdateWatchlistField } from '../../../../common/api/entity_analytics/watchlists/management';
import type { CreateWatchlistRequestBodyInput } from '../../../../common/api/entity_analytics/watchlists/management/create.gen';
import {
  WATCHLIST_DESCRIPTION_LABEL,
  WATCHLIST_NAME_LABEL,
  WATCHLIST_RISK_SCORE_WEIGHTING_LABEL,
  WATCHLIST_CSV_DATA_SOURCE_TITLE,
  WATCHLIST_CSV_DATA_SOURCE_DESCRIPTION,
} from './translations';
import { RuleBasedSourceInput } from './rule_based_source_input';
import { WatchlistCsvUpload } from './csv_upload';
import { ManagedWatchlistSourceInput } from './managed_watchlist_source_input';

export interface WatchlistFormProps {
  watchlist: CreateWatchlistRequestBodyInput;
  watchlistId?: string;
  isEditMode: boolean;
  isNameInvalid: boolean;
  onFieldChange: <K extends keyof CreateWatchlistRequestBodyInput>(
    key: K,
    value: CreateWatchlistRequestBodyInput[K]
  ) => void;
}

export const WatchlistForm = ({
  watchlist,
  watchlistId,
  isEditMode,
  isNameInvalid,
  onFieldChange,
}: WatchlistFormProps) => {
  const isManaged = watchlist.managed === true;
  const isNameDisabled = isEditMode && !canUpdateWatchlistField('name', isManaged);
  const isDescriptionDisabled = isEditMode && !canUpdateWatchlistField('description', isManaged);

  return (
    <EuiForm component="form" fullWidth>
      <EuiFormRow
        label={WATCHLIST_NAME_LABEL}
        isInvalid={isNameInvalid}
        error={
          isNameInvalid
            ? [
                i18n.translate(
                  'xpack.securitySolution.entityAnalytics.watchlists.flyout.nameInvalid',
                  {
                    defaultMessage:
                      'Use lowercase letters, numbers, ".", "_" or "-" and start with a letter or number.',
                  }
                ),
              ]
            : undefined
        }
      >
        <EuiFieldText
          name="WatchlistName"
          value={watchlist.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          isInvalid={isNameInvalid}
          disabled={isNameDisabled}
        />
      </EuiFormRow>
      <EuiFormRow
        label={WATCHLIST_DESCRIPTION_LABEL}
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
          name="WatchlistDescription"
          value={watchlist.description}
          onChange={(e) => onFieldChange('description', e.target.value)}
          disabled={isDescriptionDisabled}
        />
      </EuiFormRow>
      <EuiFormRow label={WATCHLIST_RISK_SCORE_WEIGHTING_LABEL}>
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
      {isEditMode && watchlistId && (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{WATCHLIST_CSV_DATA_SOURCE_TITLE}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <p>{WATCHLIST_CSV_DATA_SOURCE_DESCRIPTION}</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <WatchlistCsvUpload watchlistId={watchlistId} />
        </>
      )}
      <EuiSpacer size="m" />
      {watchlist.managed && <ManagedWatchlistSourceInput watchlist={watchlist} />}
      <RuleBasedSourceInput
        watchlistName={watchlist.name}
        isEditMode={isEditMode}
        isManaged={watchlist.managed}
        onFieldChange={onFieldChange}
        initialEntitySources={watchlist.entitySources}
      />
    </EuiForm>
  );
};
