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
  EuiIcon,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getIndicesWithNoSourceFields } from '@kbn/search-queries';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';

import { useIndicesFields } from '../hooks/use_indices_fields';
import { useSourceIndicesFields } from '../hooks/use_source_indices_field';
import { useQueryIndices } from '../hooks/use_query_indices';
import { handleSelectOptions } from '../utils/select_indices';
import { AddDataFlyoutIndicesSelectable } from './styles';

interface IndicesErrorCalloutProps {
  isFieldsLoading: boolean;
  emptyIndices: string[];
}
const IndicesErrorCallout = ({ emptyIndices, isFieldsLoading }: IndicesErrorCalloutProps) => {
  if (isFieldsLoading) return null;

  if (emptyIndices.length > 0) {
    return (
      <EuiCallOut
        color="danger"
        data-test-subj="NoIndicesFieldsMessage"
        title={
          <FormattedMessage
            id="xpack.searchPlayground.addDataSource.flyout.errorCallout"
            defaultMessage="One or more indices have errors"
          />
        }
      />
    );
  }
  return null;
};

interface SelectIndicesFlyout {
  onClose: () => void;
}

export const SelectIndicesFlyout: React.FC<SelectIndicesFlyout> = ({ onClose }) => {
  const { euiTheme } = useEuiTheme();
  const modalTitleId = useGeneratedHtmlId();

  const [query, setQuery] = useState<string>('');
  const { indices, isLoading: isIndicesLoading } = useQueryIndices({ query });
  const { indices: selectedIndices, setIndices: setSelectedIndices } = useSourceIndicesFields();
  const [selectedTempIndices, setSelectedTempIndices] = useState<string[]>(selectedIndices);
  const { fields, isLoading: isFieldsLoading } = useIndicesFields(selectedTempIndices);
  const { emptyIndices, disabledSave } = useMemo((): {
    disabledSave: boolean;
    emptyIndices: string[];
  } => {
    if (isFieldsLoading || selectedTempIndices.length === 0) {
      return {
        disabledSave: true,
        emptyIndices: [],
      };
    }
    const emptyIndicesList = getIndicesWithNoSourceFields(fields);
    return {
      disabledSave: (emptyIndicesList?.length ?? 0) > 0,
      emptyIndices: emptyIndicesList ?? [],
    };
  }, [fields, isFieldsLoading, selectedTempIndices]);
  const indexOptions = useMemo(
    () =>
      indices.map((index, num): EuiSelectableOption => {
        const option: EuiSelectableOption = {
          label: index,
          checked: selectedTempIndices.includes(index) ? 'on' : undefined,
          'data-test-subj': `sourceIndex-${num}`,
        };
        if (emptyIndices.includes(index)) {
          option.append = (
            <EuiToolTip
              position="top"
              content={i18n.translate(
                'xpack.searchPlayground.addDataSource.flyout.emptyIndexTooltip',
                { defaultMessage: 'No fields found in index' }
              )}
            >
              <EuiIcon type="warning" color="danger" />
            </EuiToolTip>
          );
        } else if (
          selectedTempIndices.includes(index) &&
          fields[index] &&
          fields[index].source_fields.length > 0
        ) {
          option.append = (
            <FormattedMessage
              id="xpack.searchPlayground.addDataSource.flyout.indexFieldCount"
              defaultMessage="{fieldCount, plural, one {# Field} other {# Fields}}"
              values={{ fieldCount: fields[index].source_fields.length }}
            />
          );
        }

        return option;
      }),
    [indices, selectedTempIndices, emptyIndices, fields]
  );
  const handleSaveQuery = () => {
    setSelectedIndices(selectedTempIndices);
    onClose();
  };

  return (
    <EuiFlyout size="s" ownFocus onClose={onClose} data-test-subj="selectIndicesFlyout" aria-labelledby={modalTitleId}>
      <EuiSelectable
        data-test-subj="indicesTable"
        searchable
        height="full"
        css={AddDataFlyoutIndicesSelectable(euiTheme)}
        searchProps={{
          placeholder: i18n.translate(
            'xpack.searchPlayground.addDataSource.flyout.search.placeholder',
            { defaultMessage: 'Search' }
          ),
          onChange: setQuery,
        }}
        options={indexOptions}
        onChange={handleSelectOptions(selectedTempIndices, setSelectedTempIndices)}
        listProps={{
          showIcons: true,
          bordered: true,
          onFocusBadge: false,
        }}
        isLoading={isIndicesLoading}
      >
        {(list, search) => (
          <>
            <EuiFlyoutHeader>
              <EuiTitle size="m">
                <h2 id={modalTitleId}>
                  <FormattedMessage
                    id="xpack.searchPlayground.addDataSource.flyout.title"
                    defaultMessage="Add data"
                  />
                </h2>
              </EuiTitle>
              <EuiSpacer />
              {search}
              <EuiSpacer size="s" />
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.searchPlayground.setupPage.addDataSource.flyout.selectedCount"
                  defaultMessage="{selectedCount} selected"
                  values={{
                    selectedCount: selectedTempIndices.length,
                  }}
                />
              </EuiText>
            </EuiFlyoutHeader>
            <EuiSpacer size="xs" />
            {list}
          </>
        )}
      </EuiSelectable>
      <EuiSpacer size="xs" />
      <IndicesErrorCallout emptyIndices={emptyIndices} isFieldsLoading={isFieldsLoading} />
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
                id="xpack.searchPlayground.setupPage.addDataSource.flyout.addDataButton"
                defaultMessage="Add data"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};