/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSelectable,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { getIndicesWithNoSourceFields } from '../utils/create_query';
import { useIndicesFields } from '../hooks/use_indices_fields';
import { useSourceIndicesFields } from '../hooks/use_source_indices_field';
import { useQueryIndices } from '../hooks/use_query_indices';
import { handleSelectOptions } from '../utils/select_indices';

interface SelectIndicesFlyout {
  onClose: () => void;
}

export const SelectIndicesFlyout: React.FC<SelectIndicesFlyout> = ({ onClose }) => {
  const [query, setQuery] = useState<string>('');
  const { indices, isLoading: isIndicesLoading } = useQueryIndices({ query });
  const { indices: selectedIndices, setIndices: setSelectedIndices } = useSourceIndicesFields();
  const [selectedTempIndices, setSelectedTempIndices] = useState<string[]>(selectedIndices);
  const { fields, isLoading: isFieldsLoading } = useIndicesFields(selectedTempIndices);
  const { emptyIndicesList, disabledSave } = useMemo((): {
    disabledSave: boolean;
    emptyIndicesList: string | null;
  } => {
    if (selectedTempIndices.length === 0) {
      return {
        disabledSave: true,
        emptyIndicesList: null,
      };
    }
    const emptyIndices = getIndicesWithNoSourceFields(fields);
    return {
      disabledSave: (emptyIndices?.length ?? 0) > 0,
      emptyIndicesList: emptyIndices && emptyIndices.length > 0 ? emptyIndices.join(', ') : null,
    };
  }, [fields, selectedTempIndices]);
  const indexOptions = useMemo(
    () =>
      indices.map(
        (index, num): EuiSelectableOption => ({
          label: index,
          checked: selectedTempIndices.includes(index) ? 'on' : undefined,
          'data-test-subj': `sourceIndex-${num}`,
        })
      ),
    [indices, selectedTempIndices]
  );
  const handleSaveQuery = () => {
    setSelectedIndices(selectedTempIndices);
    onClose();
  };

  return (
    <EuiFlyout size="s" ownFocus onClose={onClose} data-test-subj="selectIndicesFlyout">
      <EuiSelectable
        data-test-subj="indicesTable"
        searchable
        height="full"
        searchProps={{
          onChange: setQuery,
        }}
        options={indexOptions}
        onChange={handleSelectOptions(selectedTempIndices, setSelectedTempIndices)}
        listProps={{
          showIcons: true,
          bordered: false,
        }}
        isLoading={isIndicesLoading}
      >
        {(list, search) => (
          <>
            <EuiFlyoutHeader>
              <EuiTitle size="m">
                <h2>
                  <FormattedMessage
                    id="xpack.searchPlayground.addDataSource.flyout.title"
                    defaultMessage="Add data to query"
                  />
                </h2>
              </EuiTitle>
              <EuiSpacer />
              {search}
              <EuiSpacer size="s" />
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.searchPlayground.setupPage.addDataSource.flyout.groupOption"
                    defaultMessage="Available indices"
                  />
                </h5>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiSpacer size="s" />
            {list}
          </>
        )}
      </EuiSelectable>
      {!isFieldsLoading && emptyIndicesList !== null ? (
        <EuiCallOut color="warning" iconType="warning" data-test-subj="NoIndicesFieldsMessage">
          <p>
            <FormattedMessage
              id="xpack.searchPlayground.addDataSource.flyout.warningCallout"
              defaultMessage="No fields found for {errorMessage}. Try adding data to these indices."
              values={{ errorMessage: emptyIndicesList }}
            />
          </p>
        </EuiCallOut>
      ) : null}
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={onClose}
              flush="left"
              data-test-subj="closeButton"
            >
              <FormattedMessage
                id="xpack.searchPlayground.addDataSource.flyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleSaveQuery}
              data-test-subj="saveButton"
              fill
              disabled={disabledSave}
            >
              <FormattedMessage
                id="xpack.searchPlayground.setupPage.addDataSource.flyout.saveButton"
                defaultMessage="Save and continue"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
