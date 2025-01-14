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
} from '@elastic/eui';
import { FormProvider } from 'react-hook-form';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { isEmpty } from 'lodash';
import { NoPermissionsTooltip } from '../../common/components/permissions';
import {
  addNewGlobalParamAction,
  editGlobalParamAction,
  getGlobalParamAction,
  selectGlobalParamState,
} from '../../../state/global_params';
import { ClientPluginsStart } from '../../../../../plugin';
import { ListParamItem } from './params_list';
import { SyntheticsParams } from '../../../../../../common/runtime_types';
import { useFormWrapped } from '../../../../../hooks/use_form_wrapped';
import { AddParamForm } from './add_param_form';
import { syncGlobalParamsAction } from '../../../state/settings';

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

  const { id, ...dataToSave } = isEditingItem ?? {};

  const form = useFormWrapped<SyntheticsParams>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: dataToSave ?? {
      key: '',
      tags: [],
      description: '',
      value: '',
    },
  });

  const closeFlyout = useCallback(() => {
    setIsFlyoutVisible(false);
    setIsEditingItem(null);
    form.reset({ key: '', tags: [], description: '', value: '' });
    // no need to add form value, it keeps changing on reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setIsEditingItem]);

  const { application } = useKibana<ClientPluginsStart>().services;

  const canSave = (application?.capabilities.uptime.save ?? false) as boolean;

  const dispatch = useDispatch();

  const { isSaving, savedData } = useSelector(selectGlobalParamState);

  const onSubmit = (formData: SyntheticsParams) => {
    const { namespaces, ...paramRequest } = formData;
    const shareAcrossSpaces = namespaces?.includes(ALL_SPACES_ID);
    const newParamData = {
      ...paramRequest,
    };

    if (isEditingItem && id) {
      // omit value if it's empty
      if (isEmpty(newParamData.value)) {
        // @ts-ignore this is a valid check
        delete newParamData.value;
      }
    }

    if (isEditingItem && id) {
      dispatch(
        editGlobalParamAction.get({
          id,
          paramRequest,
        })
      );
    } else {
      dispatch(
        addNewGlobalParamAction.get({
          ...newParamData,
          share_across_spaces: shareAcrossSpaces,
        })
      );
    }
  };

  useEffect(() => {
    if (savedData && !isSaving) {
      closeFlyout();
      dispatch(getGlobalParamAction.get());
      dispatch(syncGlobalParamsAction.get());
    }
  }, [savedData, isSaving, closeFlyout, dispatch]);

  useEffect(() => {
    if (isEditingItem) {
      const { id: _id, ...dataToEdit } = isEditingItem;
      setIsFlyoutVisible(true);
      form.reset(dataToEdit);
    }
    // no need to add form value, it keeps changing on reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingItem]);

  const { handleSubmit } = form;

  let flyout;

  if (isFlyoutVisible) {
    flyout = (
      <FormProvider {...form}>
        <EuiFlyout ownFocus onClose={closeFlyout} size="m" style={{ minWidth: 500 }}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>{isEditingItem ? EDIT_PARAM : CREATE_PARAM}</h2>
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
          iconType="plusInCircleFilled"
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
