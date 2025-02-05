/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiPopoverTitle, EuiSelectable, EuiButton } from '@elastic/eui';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import React, { memo, useCallback, useMemo, useReducer, useEffect } from 'react';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
import { DEFAULT_ALERT_TAGS_KEY } from '../../../../../common/constants';
import { useUiSetting$ } from '../../../lib/kibana';
import * as i18n from './translations';
import { createInitialTagsState } from './helpers';
import { createAlertTagsReducer, initialState } from './reducer';
import type { SetAlertTagsFunc } from './use_set_alert_tags';

export interface BulkAlertTagsPanelComponentProps {
  alertItems: TimelineItem[];
  refetchQuery?: () => void;
  setIsLoading: (isLoading: boolean) => void;
  refresh?: () => void;
  clearSelection?: () => void;
  closePopoverMenu: () => void;
  onSubmit: SetAlertTagsFunc;
}

const BulkAlertTagsPanelComponent: React.FC<BulkAlertTagsPanelComponentProps> = ({
  alertItems,
  refresh,
  refetchQuery,
  setIsLoading,
  clearSelection,
  closePopoverMenu,
  onSubmit,
}) => {
  const [defaultAlertTagOptions] = useUiSetting$<string[]>(DEFAULT_ALERT_TAGS_KEY);

  const existingTags = useMemo(
    () =>
      alertItems.map(
        (item) => item.data.find((data) => data.field === ALERT_WORKFLOW_TAGS)?.value ?? []
      ),
    [alertItems]
  );
  const [{ selectableAlertTags, tagsToAdd, tagsToRemove }, dispatch] = useReducer(
    createAlertTagsReducer(),
    initialState
  );

  const addAlertTag = useCallback(
    (value: string) => {
      dispatch({ type: 'addAlertTag', value });
    },
    [dispatch]
  );

  const removeAlertTag = useCallback(
    (value: string) => {
      dispatch({ type: 'removeAlertTag', value });
    },
    [dispatch]
  );

  const setSelectableAlertTags = useCallback(
    (value: EuiSelectableOption[]) => {
      dispatch({ type: 'setSelectableAlertTags', value });
    },
    [dispatch]
  );

  const onTagsUpdate = useCallback(async () => {
    if (tagsToAdd.size === 0 && tagsToRemove.size === 0) {
      closePopoverMenu();
      return;
    }
    const tagsToAddArray = Array.from(tagsToAdd);
    const tagsToRemoveArray = Array.from(tagsToRemove);
    const ids = alertItems.map((item) => item._id);
    const tags = { tags_to_add: tagsToAddArray, tags_to_remove: tagsToRemoveArray };
    const onSuccess = () => {
      if (refetchQuery) refetchQuery();
      if (refresh) refresh();
      if (clearSelection) clearSelection();
    };
    if (onSubmit != null) {
      closePopoverMenu();
      await onSubmit(tags, ids, onSuccess, setIsLoading);
    }
  }, [
    closePopoverMenu,
    tagsToAdd,
    tagsToRemove,
    alertItems,
    refetchQuery,
    refresh,
    clearSelection,
    setIsLoading,
    onSubmit,
  ]);

  const handleTagsOnChange = useCallback(
    (
      newOptions: EuiSelectableOption[],
      event: EuiSelectableOnChangeEvent,
      changedOption: EuiSelectableOption
    ) => {
      if (changedOption.checked === 'on') {
        addAlertTag(changedOption.label);
      } else if (!changedOption.checked) {
        removeAlertTag(changedOption.label);
      }
      setSelectableAlertTags(newOptions);
    },
    [addAlertTag, removeAlertTag, setSelectableAlertTags]
  );

  useEffect(() => {
    dispatch({
      type: 'setSelectableAlertTags',
      value: createInitialTagsState(existingTags, defaultAlertTagOptions),
    });
  }, [existingTags, defaultAlertTagOptions]);

  return (
    <>
      <EuiSelectable
        searchable
        searchProps={{
          placeholder: i18n.ALERT_TAGS_MENU_SEARCH_PLACEHOLDER,
        }}
        aria-label={i18n.ALERT_TAGS_MENU_SEARCH_PLACEHOLDER}
        options={selectableAlertTags}
        onChange={handleTagsOnChange}
        emptyMessage={i18n.ALERT_TAGS_MENU_EMPTY}
        noMatchesMessage={i18n.ALERT_TAGS_MENU_SEARCH_NO_TAGS_FOUND}
        data-test-subj="alert-tags-selectable-menu"
      >
        {(list, search) => (
          <div>
            <EuiPopoverTitle>{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
      <EuiButton
        data-test-subj="alert-tags-update-button"
        fullWidth
        size="s"
        onClick={onTagsUpdate}
      >
        {i18n.ALERT_TAGS_APPLY_BUTTON_MESSAGE}
      </EuiButton>
    </>
  );
};

export const BulkAlertTagsPanel = memo(BulkAlertTagsPanelComponent);
