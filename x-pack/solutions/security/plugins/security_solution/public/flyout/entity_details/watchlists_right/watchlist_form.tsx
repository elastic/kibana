/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiRange,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter, Query } from '@kbn/es-query';
import type { SavedQuery } from '@kbn/data-plugin/public';
import { QueryBar } from '../../../common/components/query_bar';
import { useKibana } from '../../../common/lib/kibana';
import type { CreateWatchlistRequestBodyInput } from '../../../../common/api/entity_analytics/watchlists/management/create.gen';
import { SUPPORTED_FILE_TYPES } from './constants';
import {
  WATCHLIST_DESCRIPTION_LABEL,
  WATCHLIST_ENTITY_FIELD_ARIA_LABEL,
  WATCHLIST_ENTITY_FIELD_PLACEHOLDER,
  WATCHLIST_FILE_PICKER_ARIA_LABEL,
  WATCHLIST_FILE_UPLOAD_LABEL,
  WATCHLIST_FILTER_QUERY_HELP_TEXT,
  WATCHLIST_FILTER_QUERY_LABEL,
  WATCHLIST_IDENTIFY_ENTITIES_BY_LABEL,
  WATCHLIST_NAME_LABEL,
  WATCHLIST_RISK_SCORE_WEIGHTING_LABEL,
} from './translations';

export interface WatchlistFormProps {
  watchlist: CreateWatchlistRequestBodyInput;
  isNameInvalid: boolean;
  onFieldChange: <K extends keyof CreateWatchlistRequestBodyInput>(
    key: K,
    value: CreateWatchlistRequestBodyInput[K]
  ) => void;
}

export const WatchlistForm = ({ watchlist, isNameInvalid, onFieldChange }: WatchlistFormProps) => {
  const {
    services: { data },
  } = useKibana();
  const [dataView, setDataView] = useState<DataView>();
  const [filterQuery, setFilterQuery] = useState<Query>({ query: '', language: 'kuery' });
  const [savedQuery, setSavedQuery] = useState<SavedQuery | undefined>(undefined);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [entityField, setEntityField] = useState<string>('');
  const filterManager = data.query.filterManager;

  useEffect(() => {
    setFilters(filterManager.getFilters());
    const subscription = filterManager.getUpdates$().subscribe(() => {
      setFilters(filterManager.getFilters());
    });

    return () => subscription.unsubscribe();
  }, [filterManager]);

  useEffect(() => {
    let isSubscribed = true;
    const loadDefaultDataView = async () => {
      const defaultDataView = await data.dataViews.getDefaultDataView();
      if (isSubscribed && defaultDataView) {
        setDataView(defaultDataView);
      }
    };

    loadDefaultDataView();

    return () => {
      isSubscribed = false;
    };
  }, [data.dataViews]);

  const onSubmitQuery = useCallback((query: Query) => {
    setFilterQuery(query);
  }, []);

  const onSavedQuery = useCallback((newSavedQuery: SavedQuery | undefined) => {
    setSavedQuery(newSavedQuery);
  }, []);

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
      <EuiFormRow label={WATCHLIST_FILE_UPLOAD_LABEL}>
        <EuiFilePicker
          data-test-subj="upload-watchlist-file"
          accept={SUPPORTED_FILE_TYPES.join(',')}
          fullWidth
          onChange={() => {}} // TODO use fileUploader from privmon
          isInvalid={false}
          isLoading={false}
          aria-label={WATCHLIST_FILE_PICKER_ARIA_LABEL}
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
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.flyout.createByQueryTitle"
              defaultMessage="Create watchlist by query"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow label={WATCHLIST_FILTER_QUERY_LABEL} helpText={WATCHLIST_FILTER_QUERY_HELP_TEXT}>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            {dataView ? (
              // TODO: plug into endpoint when available: https://github.com/elastic/security-team/issues/15538
              <QueryBar
                indexPattern={dataView}
                isRefreshPaused={true}
                filterQuery={filterQuery}
                filterManager={filterManager}
                filters={filters}
                onSubmitQuery={onSubmitQuery}
                savedQuery={savedQuery}
                onSavedQuery={onSavedQuery}
                hideSavedQuery={false}
                displayStyle="inPage"
                dataTestSubj="watchlistFilterQuery"
              />
            ) : (
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.watchlists.flyout.filterQueryLoading"
                  defaultMessage="Loading data view..."
                />
              </EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiFormRow label={WATCHLIST_IDENTIFY_ENTITIES_BY_LABEL}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiSuperSelect
              valueOfSelected={entityField}
              placeholder={WATCHLIST_ENTITY_FIELD_PLACEHOLDER}
              // TODO: remove this when backend route available: https://github.com/elastic/security-team/issues/15538
              options={[
                { value: 'user.name', inputDisplay: 'user.name' },
                { value: 'host.name', inputDisplay: 'host.name' },
                { value: 'source.ip', inputDisplay: 'source.ip' },
              ]}
              onChange={(value) => setEntityField(value)}
              aria-label={WATCHLIST_ENTITY_FIELD_ARIA_LABEL}
              style={{ width: 240 }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiForm>
  );
};
