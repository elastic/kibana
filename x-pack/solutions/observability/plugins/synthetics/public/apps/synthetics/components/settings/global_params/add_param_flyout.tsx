/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ALL_SPACES_ID } from '@kbn/security-plugin/public';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiButton,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormProvider } from 'react-hook-form';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux-v7';
import { isEmpty } from 'lodash';
import { NoPermissionsTooltip } from '../../common/components/permissions';
import {
  addNewGlobalParamAction,
  editGlobalParamAction,
  getGlobalParamAction,
  selectGlobalParamState,
} from '../../../state/global_params';
import type { ClientPluginsStart } from '../../../../../plugin';
import type { ListParamItem } from './params_list';
import type { SyntheticsParamRequest } from '../../../../../../common/runtime_types';
import { useFormWrapped } from '../../../../../hooks/use_form_wrapped';
import { AddParamForm } from './add_param_form';
import type { ParamFormData } from './add_param_form';

const toFormData = (item: ListParamItem | null): ParamFormData => {
  if (!item) {
    return {
      key: '',
      tags: [],
      description: '',
      value: '',
      sourceType: 'value',
      source: { type: 'vault', path: '', field: '' },
    };
  }
  const { id: _id, source, ...rest } = item;
  return {
    ...rest,
    sourceType: source?.type === 'vault' ? 'vault' : 'value',
    source: { type: 'vault', path: source?.path ?? '', field: source?.field ?? '' },
  };
};

export const AddParamFlyout = ({
  items,
  isEditingItem,
  setIsEditingItem,
}: {
  items: ListParamItem[];
  isEditingItem: ListParamItem | null;
  setIsEditingItem: React.Dispatch<React.SetStateAction<ListParamItem | null>>;
}) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const { id } = isEditingItem ?? {};

  const form = useFormWrapped<ParamFormData>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: toFormData(isEditingItem),
  });

  const closeFlyout = useCallback(() => {
    setIsFlyoutVisible(false);
    setIsEditingItem(null);
    form.reset(toFormData(null));
    // no need to add form value, it keeps changing on reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setIsEditingItem]);

  const { application } = useKibana<ClientPluginsStart>().services;

  const canSave = (application?.capabilities.uptime.save ?? false) as boolean;

  const dispatch = useDispatch();

  const { isSaving, savedData } = useSelector(selectGlobalParamState);

  const onSubmit = (formData: ParamFormData) => {
    const { namespaces, sourceType, source, value, key, description, tags } = formData;
    const shareAcrossSpaces = namespaces?.includes(ALL_SPACES_ID);
    const isVault = sourceType === 'vault';

    const paramRequest: SyntheticsParamRequest = { key, description, tags };
    if (isVault) {
      paramRequest.source = {
        type: 'vault',
        path: (source?.path ?? '').trim(),
        field: (source?.field ?? '').trim(),
      };
    } else if (!(isEditingItem && id && isEmpty(value))) {
      // include the literal value unless editing and left blank (keep current)
      paramRequest.value = value;
    }

    if (isEditingItem && id) {
      dispatch(editGlobalParamAction.get({ id, paramRequest }));
    } else {
      dispatch(
        addNewGlobalParamAction.get({
          ...paramRequest,
          share_across_spaces: shareAcrossSpaces,
        })
      );
    }
  };

  useEffect(() => {
    if (savedData && !isSaving) {
      closeFlyout();
      dispatch(getGlobalParamAction.get());
    }
  }, [savedData, isSaving, closeFlyout, dispatch]);

  useEffect(() => {
    if (isEditingItem) {
      setIsFlyoutVisible(true);
      form.reset(toFormData(isEditingItem));
    }
    // no need to add form value, it keeps changing on reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingItem]);

  const { handleSubmit } = form;

  const flyoutTitleId = useGeneratedHtmlId();

  let flyout;

  if (isFlyoutVisible) {
    flyout = (
      <FormProvider {...form}>
        <EuiFlyout
          ownFocus
          onClose={closeFlyout}
          size="m"
          style={{ minWidth: 500 }}
          aria-labelledby={flyoutTitleId}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{isEditingItem ? EDIT_PARAM : CREATE_PARAM}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiSpacer size="m" />
            <AddParamForm items={items} isEditingItem={isEditingItem} />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="syntheticsAddParamFlyoutButton"
                  iconType="cross"
                  onClick={closeFlyout}
                  flush="left"
                >
                  {CLOSE_TABLE}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="syntheticsAddParamFlyoutButton"
                  onClick={handleSubmit(onSubmit)}
                  fill
                  isLoading={isSaving}
                >
                  {SAVE_TABLE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </FormProvider>
    );
  }

  return (
    <div>
      <NoPermissionsTooltip canEditSynthetics={canSave}>
        <EuiButton
          data-test-subj="syntheticsAddParamFlyoutButton"
          fill
          iconType="plusCircle"
          iconSide="left"
          onClick={() => setIsFlyoutVisible(true)}
          isDisabled={!canSave}
        >
          {CREATE_PARAM}
        </EuiButton>
      </NoPermissionsTooltip>
      {flyout}
    </div>
  );
};

const CLOSE_TABLE = i18n.translate('xpack.synthetics.settingsRoute.cancel', {
  defaultMessage: 'Close',
});

const CREATE_PARAM = i18n.translate('xpack.synthetics.settingsRoute.createParam', {
  defaultMessage: 'Create Parameter',
});

const EDIT_PARAM = i18n.translate('xpack.synthetics.settingsRoute.params.editLabel', {
  defaultMessage: 'Edit Parameter',
});

const SAVE_TABLE = i18n.translate('xpack.synthetics.settingsRoute.save', {
  defaultMessage: 'Save',
});
