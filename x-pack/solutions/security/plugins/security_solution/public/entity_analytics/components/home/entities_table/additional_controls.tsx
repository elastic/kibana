/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';
import numeral from '@elastic/numeral';
import { FieldsSelectorModal } from './fields_selector_modal';
import { useFieldsModal } from './hooks/use_fields_modal';
import { DataViewContext } from '.';

const ENTITY_ANALYTICS_FIELDS_SELECTOR_OPEN_BUTTON = 'entityAnalyticsFieldsSelectorOpenButton';

/** 1k, 6k, 6.5k: whole thousands drop the ".0". */
const getShortCount = (count: number): string =>
  count < 1000 ? String(count) : numeral(count).format('0.[0]a');

/** The short count, with the exact one on hover. */
const TotalCount = ({ total }: { total: number }) => (
  <EuiToolTip content={<FormattedNumber value={total} />}>
    <span tabIndex={0}>{getShortCount(total)}</span>
  </EuiToolTip>
);

export const AdditionalControls = ({
  total,
  shown,
  title,
  columns,
  onAddColumn,
  onRemoveColumn,
  onResetColumns,
}: {
  /** Undefined while it loads; shows a placeholder styled by the parent. */
  total?: number;
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
            {total == null ? (
              <span className="entityAnalyticsDataTableTotalLoading" />
            ) : shown != null && shown < total ? (
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.entitiesTable.shownOfTotal"
                defaultMessage="Showing {shown} of {total} {title}"
                values={{ shown: getShortCount(shown), total: <TotalCount total={total} />, title }}
              />
            ) : (
              <>
                <TotalCount total={total} /> {title}
              </>
            )}
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
