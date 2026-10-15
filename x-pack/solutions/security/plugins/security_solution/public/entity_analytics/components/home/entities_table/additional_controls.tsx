/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { getAbbreviatedNumber } from '@kbn/cloud-security-posture-common';
import { FieldsSelectorModal } from './fields_selector_modal';
import { useFieldsModal } from './hooks/use_fields_modal';
import { DataViewContext } from '.';

const ENTITY_ANALYTICS_FIELDS_SELECTOR_OPEN_BUTTON = 'entityAnalyticsFieldsSelectorOpenButton';

const getShownOfTotalLabel = (shown: number, total: number, title: string) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.entitiesTable.shownOfTotal', {
    defaultMessage: 'Showing {shown, number} of {total, number} {title}',
    values: { shown, total, title },
  });

export const AdditionalControls = ({
  total,
  shown,
  title,
  columns,
  onAddColumn,
  onRemoveColumn,
  onResetColumns,
}: {
  total: number;
  shown?: number;
  title: string;
  columns: string[];
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
  onResetColumns: () => void;
}) => {
  const { isFieldSelectorModalVisible, closeFieldsSelectorModal, openFieldsSelectorModal } =
    useFieldsModal();

  const { dataView } = useContext(DataViewContext);

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
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <span className="entityAnalyticsDataTableTotal">
            {shown != null && shown < total
              ? getShownOfTotalLabel(shown, total, title)
              : `${getAbbreviatedNumber(total)} ${title}`}
          </span>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="tableOfContents"
            onClick={openFieldsSelectorModal}
            size="xs"
            color="text"
            data-test-subj={ENTITY_ANALYTICS_FIELDS_SELECTOR_OPEN_BUTTON}
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entitiesTable.fieldsButton"
              defaultMessage="Fields"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
