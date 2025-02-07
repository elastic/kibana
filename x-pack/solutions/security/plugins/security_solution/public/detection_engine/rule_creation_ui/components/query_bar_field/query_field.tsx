/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiMutationObserver } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { Subscription } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import type { DataViewBase, Query } from '@kbn/es-query';
import type { SavedQuery } from '@kbn/data-plugin/public';
import { FilterManager } from '@kbn/data-plugin/public';

import { OpenTimelineModal } from '../../../../timelines/components/open_timeline/open_timeline_modal';
import type { ActionTimelineToShow } from '../../../../timelines/components/open_timeline/types';
import { QueryBar } from '../../../../common/components/query_bar';
import { useKibana } from '../../../../common/lib/kibana';
import type { TimelineModel } from '../../../../timelines/store/model';
import { useSavedQueryServices } from '../../../../common/utils/saved_query_services';
import type { FieldHook } from '../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import type { FieldValueQueryBar } from './types';
import * as i18n from './translations';

export interface QueryBarFieldProps {
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  isLoading: boolean;
  indexPattern: DataViewBase;
  onCloseTimelineSearch: () => void;
  openTimelineSearch: boolean;
  resizeParentContainer?: (height: number) => void;
  onValidityChange?: (arg: boolean) => void;
  isDisabled?: boolean;
  /**
   * if saved query selected, reset query and filters to saved query values
   */
  resetToSavedQuery?: boolean;
  /**
   * called when fetching of saved query fails
   */
  onSavedQueryError?: () => void;
  defaultSavedQuery?: SavedQuery | undefined;
  onOpenTimeline?: (timeline: TimelineModel) => void;
}

const actionTimelineToHide: ActionTimelineToShow[] = ['duplicate', 'createFrom'];

const getFieldValueFromEmptySavedQuery = () => ({
  filters: [],
  query: {
    query: '',
    language: 'kuery',
  },
  saved_id: null,
});

const savedQueryToFieldValue = (savedQuery: SavedQuery): FieldValueQueryBar => ({
  filters: savedQuery.attributes.filters ?? [],
  query: savedQuery.attributes.query,
  saved_id: savedQuery.id,
  title: savedQuery.attributes.title,
});

export const QueryBarField = ({
  defaultSavedQuery,
  dataTestSubj,
  field,
  idAria,
  indexPattern,
  isLoading = false,
  onCloseTimelineSearch,
  openTimelineSearch = false,
  resizeParentContainer,
  onValidityChange,
  isDisabled,
  resetToSavedQuery,
  onOpenTimeline,
  onSavedQueryError,
}: QueryBarFieldProps) => {
  const { value: fieldValue, setValue: setFieldValue } = field as FieldHook<FieldValueQueryBar>;
  const [originalHeight, setOriginalHeight] = useState(-1);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [savedQuery, setSavedQuery] = useState<SavedQuery | undefined>(defaultSavedQuery);
  const [isSavedQueryFailedToLoad, setIsSavedQueryFailedToLoad] = useState(false);
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const { uiSettings } = useKibana().services;
  const [filterManager] = useState<FilterManager>(new FilterManager(uiSettings));

  const savedQueryServices = useSavedQueryServices();

  // Bubbles up field validity to parent.
  // Using something like form `getErrors` does
  // not guarantee latest validity state
  useEffect((): void => {
    if (onValidityChange != null) {
      onValidityChange(!isInvalid);
    }
  }, [isInvalid, onValidityChange]);

  useEffect(() => {
    let isSubscribed = true;
    const subscriptions = new Subscription();
    filterManager.setFilters([]);

    subscriptions.add(
      filterManager.getUpdates$().subscribe({
        next: () => {
          if (isSubscribed) {
            const newFilters = filterManager.getFilters();
            const { filters } = fieldValue;

            if (!deepEqual(filters, newFilters)) {
              setFieldValue({ ...fieldValue, filters: newFilters });
            }
          }
        },
      })
    );

    return () => {
      isSubscribed = false;
      subscriptions.unsubscribe();
    };
  }, [fieldValue, filterManager, setFieldValue]);

  useEffect(() => {
    let isSubscribed = true;
    async function updateFilterQueryFromValue() {
      const { filters, saved_id: savedId } = fieldValue;
      if (!deepEqual(filters, filterManager.getFilters())) {
        filterManager.setFilters(filters);
      }
      if (
        (savedId != null && savedQuery != null && savedId !== savedQuery.id) ||
        (savedId != null && savedQuery == null)
      ) {
        try {
          const mySavedQuery = await savedQueryServices.getSavedQuery(savedId);
          if (isSubscribed && mySavedQuery != null) {
            setSavedQuery(mySavedQuery);
          }
          setIsSavedQueryFailedToLoad(false);
        } catch {
          setSavedQuery(undefined);
          setIsSavedQueryFailedToLoad(true);
        }
      } else if (savedId == null && savedQuery != null) {
        setSavedQuery(undefined);
      }
    }
    updateFilterQueryFromValue();
    return () => {
      isSubscribed = false;
    };
  }, [
    fieldValue,
    filterManager,
    savedQuery,
    savedQueryServices,
    setIsSavedQueryFailedToLoad,
    setFieldValue,
  ]);

  useEffect(() => {
    if (isSavedQueryFailedToLoad) {
      onSavedQueryError?.();
    }
  }, [onSavedQueryError, isSavedQueryFailedToLoad]);

  // if saved query fetched, reset values in queryBar input and filters to saved query's values
  useEffect(() => {
    if (resetToSavedQuery && savedQuery) {
      const newFieldValue = savedQueryToFieldValue(savedQuery);
      setFieldValue(newFieldValue);
    }
  }, [resetToSavedQuery, savedQuery, setFieldValue]);

  const onSubmitQuery = useCallback(
    (newQuery: Query) => {
      const { query } = fieldValue;
      if (!deepEqual(query, newQuery)) {
        setFieldValue({ ...fieldValue, query: newQuery });
      }
    },
    [fieldValue, setFieldValue]
  );

  const onChangedQuery = useCallback(
    (newQuery: Query) => {
      const { query } = fieldValue;
      if (!deepEqual(query, newQuery)) {
        // if saved query failed to load, delete saved_id, when user types custom query
        const savedId = isSavedQueryFailedToLoad ? null : fieldValue.saved_id;

        setFieldValue({ ...fieldValue, query: newQuery, saved_id: savedId });
      }
    },
    [fieldValue, setFieldValue, isSavedQueryFailedToLoad]
  );

  const onSavedQuery = useCallback(
    (newSavedQuery: SavedQuery | undefined) => {
      if (newSavedQuery != null) {
        const { saved_id: savedId } = fieldValue;
        setIsSavedQueryFailedToLoad(false);
        setSavedQuery(newSavedQuery);
        if (newSavedQuery.id !== savedId) {
          const newFiledValue = savedQueryToFieldValue(newSavedQuery);
          setFieldValue(newFiledValue);
        } else {
          setFieldValue(getFieldValueFromEmptySavedQuery());
        }
      }
    },
    [fieldValue, setFieldValue, setIsSavedQueryFailedToLoad]
  );

  const onCloseTimelineModal = useCallback(() => {
    setLoadingTimeline(true);
    onCloseTimelineSearch();
  }, [onCloseTimelineSearch]);

  const onOpenTimelineCb = useCallback(
    (timeline: TimelineModel) => {
      setLoadingTimeline(false);
      onOpenTimeline?.(timeline);
    },
    [onOpenTimeline]
  );

  const onMutation = () => {
    if (resizeParentContainer != null) {
      const suggestionContainer = document.getElementById('kbnTypeahead__items');
      if (suggestionContainer != null) {
        const box = suggestionContainer.getBoundingClientRect();
        const accordionContainer = document.getElementById('define-rule');
        if (accordionContainer != null) {
          const accordionBox = accordionContainer.getBoundingClientRect();
          if (originalHeight === -1 || accordionBox.height < originalHeight + box.height) {
            resizeParentContainer(originalHeight + box.height - 100);
          }
          if (originalHeight === -1) {
            setOriginalHeight(accordionBox.height);
          }
        }
      } else {
        resizeParentContainer(-1);
      }
    }
  };

  return (
    <>
      <EuiFormRow
        label={field.label}
        labelAppend={field.labelAppend}
        helpText={field.helpText}
        error={errorMessage}
        isInvalid={isInvalid}
        fullWidth
        data-test-subj={dataTestSubj}
        describedByIds={idAria ? [idAria] : undefined}
      >
        <EuiMutationObserver
          observerOptions={{ subtree: true, attributes: true, childList: true }}
          onMutation={onMutation}
        >
          {(mutationRef) => (
            <div ref={mutationRef}>
              <QueryBar
                indexPattern={indexPattern}
                isLoading={isLoading || loadingTimeline}
                isRefreshPaused={false}
                filterQuery={fieldValue.query}
                filterManager={filterManager}
                filters={filterManager.getFilters() || []}
                onChangedQuery={onChangedQuery}
                onSubmitQuery={onSubmitQuery}
                savedQuery={savedQuery}
                onSavedQuery={onSavedQuery}
                hideSavedQuery={false}
                displayStyle="inPage"
                isDisabled={isDisabled}
              />
            </div>
          )}
        </EuiMutationObserver>
      </EuiFormRow>
      {openTimelineSearch ? (
        <OpenTimelineModal
          hideActions={actionTimelineToHide}
          modalTitle={i18n.IMPORT_TIMELINE_MODAL}
          onClose={onCloseTimelineModal}
          onOpen={onOpenTimelineCb}
        />
      ) : null}
    </>
  );
};
