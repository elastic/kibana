/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButton,
  EuiModalFooter,
  EuiSpacer,
  EuiComboBox,
  EuiModalHeaderTitle,
  EuiModalHeader,
  EuiModalBody,
  EuiModal,
  EuiFormRow,
  EuiCallOut,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useDebounceFn } from '@kbn/react-hooks';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useFetchPrivilegedUserIndices } from '../hooks/use_fetch_privileged_user_indices';

const SELECT_INDEX_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.selectIndex.comboboxPlaceholder',
  {
    defaultMessage: 'Select index',
  }
);

const LOADING_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.selectIndex.error',
  {
    defaultMessage: 'Error loading indices. Please try again later.',
  }
);

const DEBOUNCE_OPTIONS = { wait: 300 };

export const IndexSelectorModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { addError } = useAppToasts();
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const { data: indices, isFetching, error } = useFetchPrivilegedUserIndices(searchQuery);
  const [selectedOptions, setSelected] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const debouncedSetSearchQuery = useDebounceFn(setSearchQuery, DEBOUNCE_OPTIONS);
  const options = useMemo(
    () =>
      indices?.map((index) => ({
        label: index,
      })) ?? [],
    [indices]
  );

  useEffect(() => {
    if (error != null) {
      addError(error, { title: LOADING_ERROR_MESSAGE });
    }
  }, [addError, error]);

  if (!isOpen) {
    return null;
  }

  return (
    <EuiModal onClose={onClose} maxWidth="624px">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.selectIndex.title"
            defaultMessage="Select index"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.selectIndex.description"
          defaultMessage="Add your privileged users by selecting one or more indices as data source. All user names in the indices, specified in user.name field, will be defined as privileged users."
        />
        <EuiSpacer size="l" />
        {error ? (
          <>
            <EuiCallOut color="danger">{LOADING_ERROR_MESSAGE}</EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.selectIndex.comboboxLabel"
              defaultMessage="Index"
            />
          }
          fullWidth
        >
          <EuiComboBox
            isLoading={isFetching && !error}
            fullWidth
            aria-label={SELECT_INDEX_LABEL}
            placeholder={SELECT_INDEX_LABEL}
            options={options}
            selectedOptions={selectedOptions}
            onChange={setSelected}
            isClearable={true}
            onSearchChange={(query) => {
              debouncedSetSearchQuery.run(query);
            }}
            async
            optionMatcher={(_) => false} // prevent the combo box from searching on the client side
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="plusInCircle" onClick={() => {}}>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.selectIndex.createIndexButtonLabel"
                defaultMessage="Create index"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiButtonEmpty onClick={onClose}>
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.selectIndex.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
              <EuiButton onClick={() => {}} fill>
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.selectIndex.addUserButtonLabel"
                  defaultMessage="Add privileged users"
                />
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
