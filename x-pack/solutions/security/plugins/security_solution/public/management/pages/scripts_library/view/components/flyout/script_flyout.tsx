/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFlyout } from '@elastic/eui';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { useSetUrlParams } from '../../../../../components/artifact_list_page/hooks/use_set_url_params';
import type { ListScriptsRequestQuery } from '../../../../../../../common/api/endpoint';
import { useToasts } from '../../../../../../common/lib/kibana';
import {
  useScriptsLibraryUrlParams,
  type ScriptsLibraryUrlParams,
} from '../scripts_library_url_params';
import { EndpointScriptFlyoutLoading } from './script_flyout_loading';
import { useGetEndpointScript } from '../../../../../hooks/script_library';
import type { EndpointScript } from '../../../../../../../common/endpoint/types';
import type { UseScriptActionItemsProps } from '../../hooks/use_script_action_items';
import { EndpointScriptDetailsFlyout } from '../details';
import { EndpointScriptEditFlyout, type EndpointScriptEditFlyoutProps } from '../edit';
import { SCRIPT_LIBRARY_LABELS as flyoutLabels } from '../../../translations';
import { useWithScriptSubmit } from '../../hooks/use_with_script_submit';

type ScriptFormStateItem =
  | (EndpointScript & { file?: File })
  | {
      id: string;
      // required by submit hook types
      name: string;
      platform: EndpointScript['platform'];
      file?: File;
    };

const createFormState = (
  scriptItem?: EndpointScript
): { isValid: boolean; hasFormChanged: boolean; scriptItem: ScriptFormStateItem } => ({
  isValid: false,
  hasFormChanged: false, // used for tracking unsaved changes to show discard changes modal
  scriptItem:
    scriptItem ??
    ({
      id: '',
      name: '',
      platform: [],
    } as const),
});
export interface EndpointScriptFlyoutProps {
  onCloseFlyout: (hasFormChanged: boolean) => void;
  onClickAction: UseScriptActionItemsProps['onClickAction'];
  onSuccess: () => void;
  queryParams: ListScriptsRequestQuery;
  scriptItem?: EndpointScript;
  show: Exclude<Required<ScriptsLibraryUrlParams>['show'], 'delete'>;
  'data-test-subj'?: string;
}
export const EndpointScriptFlyout = memo<EndpointScriptFlyoutProps>(
  ({
    queryParams,
    scriptItem,
    show,
    onCloseFlyout,
    onClickAction,
    onSuccess,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const toasts = useToasts();
    const isMounted = useIsMounted();
    const { selectedScriptId } = useScriptsLibraryUrlParams();
    const setUrlParams = useSetUrlParams();
    const [formState, setFormState] = useState<ReturnType<typeof createFormState>>(
      createFormState(scriptItem)
    );

    const isViewingOrEditing = useMemo(() => show === 'edit' || show === 'details', [show]);
    const isEditForm = useMemo(() => show === 'edit', [show]);

    const hasItemForViewOrEdit = useMemo(
      () => !!scriptItem && formState.scriptItem.id !== '',
      [formState.scriptItem.id, scriptItem]
    );
    const shouldFetchScriptToViewOrEdit = useMemo(() => {
      return isViewingOrEditing && !hasItemForViewOrEdit;
    }, [hasItemForViewOrEdit, isViewingOrEditing]);

    // fetch script data if needed for edit or view
    const {
      isRefetching: isFetchingScriptForViewOrEdit,
      error: fetchScriptError,
      refetch: fetchScriptData,
    } = useGetEndpointScript(selectedScriptId ?? '', {
      enabled: false,
    });

    const onChange = useCallback(
      ({
        script,
        hasFormChanged,
        isValid,
      }: Parameters<EndpointScriptEditFlyoutProps['onChange']>[number]) => {
        if (isMounted()) {
          setFormState((prevState) => ({
            ...prevState,
            isValid,
            hasFormChanged,
            scriptItem: {
              ...prevState.scriptItem,
              ...script,
            },
          }));
        }
      },
      [setFormState, isMounted]
    );

    const useSubmitScript = useWithScriptSubmit(
      show as Extract<Required<ScriptsLibraryUrlParams>['show'], 'edit' | 'create'>
    );

    const {
      isLoading: isSubmittingData,
      mutateAsync: submitScriptData,
      error: submitScriptError,
    } = useSubmitScript(formState.scriptItem);

    const onSuccessSubmit = useCallback(() => {
      toasts.addSuccess(
        isEditForm
          ? flyoutLabels.flyout.flyoutEditSubmitSuccess
          : flyoutLabels.flyout.flyoutCreateSubmitSuccess
      );

      if (isMounted()) {
        setUrlParams({
          ...queryParams,
          selectedScriptId: undefined,
          show: undefined,
        });
        onSuccess();
      }
    }, [toasts, isEditForm, isMounted, queryParams, onSuccess, setUrlParams]);

    const onSubmit = useCallback(() => {
      submitScriptData(formState.scriptItem).then(onSuccessSubmit);
    }, [formState.scriptItem, onSuccessSubmit, submitScriptData]);

    const onCloseFlyoutHandler = useCallback(
      () => onCloseFlyout(formState.hasFormChanged),
      [formState.hasFormChanged, onCloseFlyout]
    );

    // fetch script data if needed for edit or view
    useEffect(() => {
      if (
        shouldFetchScriptToViewOrEdit &&
        !hasItemForViewOrEdit &&
        !isFetchingScriptForViewOrEdit &&
        !fetchScriptError
      ) {
        fetchScriptData().then(({ data: fetchedScriptData }) => {
          if (fetchedScriptData && isMounted()) {
            setFormState(createFormState(fetchedScriptData.data));
          }
        });
      }
    }, [
      fetchScriptError,
      fetchScriptData,
      hasItemForViewOrEdit,
      isFetchingScriptForViewOrEdit,
      isMounted,
      shouldFetchScriptToViewOrEdit,
    ]);

    // show warning toast if error fetching script to view or edit
    useEffect(() => {
      if (isViewingOrEditing && fetchScriptError) {
        toasts.addWarning(
          flyoutLabels.flyout.flyoutViewItemFetchError(
            fetchScriptError?.body?.message || fetchScriptError.message
          )
        );
        if (isMounted()) {
          setUrlParams({
            ...queryParams,
            selectedScriptId: undefined,
            show: undefined,
          });
        }
      }
    }, [fetchScriptError, isViewingOrEditing, queryParams, isMounted, setUrlParams, toasts]);

    return (
      <EuiFlyout
        id={`endpointScriptFlyout-${scriptItem?.id}`}
        aria-labelledby={getTestId('flyout')}
        onClose={onCloseFlyoutHandler}
        ownFocus
        size={680}
        paddingSize="l"
        data-test-subj={getTestId()}
      >
        {shouldFetchScriptToViewOrEdit && (
          <EndpointScriptFlyoutLoading data-test-subj={getTestId('loading')} />
        )}

        {!shouldFetchScriptToViewOrEdit && show === 'details' && (
          <EndpointScriptDetailsFlyout
            onClickAction={onClickAction}
            scriptItem={scriptItem ?? (formState.scriptItem as EndpointScript)}
            data-test-subj={getTestId()}
          />
        )}

        {!shouldFetchScriptToViewOrEdit && (show === 'edit' || show === 'create') && (
          <EndpointScriptEditFlyout
            error={submitScriptError}
            isDisabled={!formState.isValid || isSubmittingData}
            isSubmittingData={isSubmittingData}
            onChange={onChange}
            onClose={onCloseFlyoutHandler}
            onSubmit={onSubmit}
            scriptItem={formState.scriptItem as EndpointScript}
            show={show}
            data-test-subj={getTestId()}
          />
        )}
      </EuiFlyout>
    );
  }
);

EndpointScriptFlyout.displayName = 'EndpointScriptFlyout';
