/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type FC, type PropsWithChildren } from 'react';
import { EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getAbbreviatedNumber } from '@kbn/cloud-security-posture-common';
import { FieldsSelectorModal } from './fields_selector_modal';
import { useFieldsModal } from '../hooks/use_fields_modal';
import { useStyles } from '../hooks/use_styles';
import { useDataViewContext } from '../hooks/data_view_context';

const ASSET_INVENTORY_FIELDS_SELECTOR_OPEN_BUTTON = 'assetInventoryFieldsSelectorOpenButton';

const GroupSelectorWrapper: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const styles = useStyles();

  return (
    <EuiFlexItem grow={false} className={styles.groupBySelector}>
      {children}
    </EuiFlexItem>
  );
};

export const AdditionalControls = ({
  total,
  title,
  columns,
  onAddColumn,
  onRemoveColumn,
  groupSelectorComponent,
  onResetColumns,
}: {
  total: number;
  title: string;
  columns: string[];
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
  groupSelectorComponent?: JSX.Element;
  onResetColumns: () => void;
}) => {
  const { isFieldSelectorModalVisible, closeFieldsSelectorModal, openFieldsSelectorModal } =
    useFieldsModal();

  const { dataView } = useDataViewContext();

  return (
    <>
      {isFieldSelectorModalVisible && (
        <FieldsSelectorModal
          columns={columns}
          dataView={dataView}
          closeModal={closeFieldsSelectorModal}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
          onResetColumns={onResetColumns}
        />
      )}
      <EuiFlexItem grow={0}>
        <span className="assetInventoryDataTableTotal">{`${getAbbreviatedNumber(
          total
        )} ${title}`}</span>
      </EuiFlexItem>
      <EuiFlexItem grow={0}>
        <EuiButtonEmpty
          className="assetInventoryDataTableFields"
          iconType="tableOfContents"
          onClick={openFieldsSelectorModal}
          size="xs"
          color="text"
          data-test-subj={ASSET_INVENTORY_FIELDS_SELECTOR_OPEN_BUTTON}
        >
          <FormattedMessage
            id="xpack.securitySolution.assetInventory.dataTable.fieldsButton"
            defaultMessage="Fields"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      {groupSelectorComponent && (
        <GroupSelectorWrapper>{groupSelectorComponent}</GroupSelectorWrapper>
      )}
    </>
  );
};
