/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSelect, EuiToolTip } from '@elastic/eui';
import { normalizeUnit, UNIT_OPTIONS } from '../types';
import { useInventoryContext } from './inventory_context';

/**
 * Toolbar with unit selector and action buttons.
 * Consumes InventoryContext directly.
 */
export const InventoryToolbar: React.FC = () => {
  const { inventory, handleUnitChange, openLegendModal, openSaveQueryModal } =
    useInventoryContext();

  const { selectedMetric } = inventory;

  const normalizedUnit = normalizeUnit({
    fieldName: selectedMetric?.name ?? '',
    unit: selectedMetric?.unit,
  });

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" justifyContent="flexEnd" wrap>
      {/* Unit selector */}
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('xpack.infra.esqlInventory.editor.unitTooltip', {
            defaultMessage: 'Select how metric values should be formatted',
          })}
        >
          <EuiSelect
            data-test-subj="infraEsqlInventoryUnitSelect"
            aria-label={i18n.translate('xpack.infra.esqlInventory.editor.unitAriaLabel', {
              defaultMessage: 'Select unit for metric formatting',
            })}
            compressed
            prepend={i18n.translate('xpack.infra.esqlInventory.editor.unitLabel', {
              defaultMessage: 'Unit',
            })}
            options={UNIT_OPTIONS.map((opt) => ({
              value: opt.value,
              text: opt.label,
            }))}
            value={normalizedUnit}
            onChange={(e) => handleUnitChange(e.target.value)}
          />
        </EuiToolTip>
      </EuiFlexItem>

      {/* Action buttons */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="infraEsqlInventoryLegendButton"
              onClick={openLegendModal}
              iconType="palette"
              size="s"
            >
              {i18n.translate('xpack.infra.esqlInventory.colors.label', {
                defaultMessage: 'Colors',
              })}
            </EuiButton>
          </EuiFlexItem>

          {selectedMetric?.isCustom && selectedMetric?.customId && (
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="infraEsqlInventoryEditQueryButton"
                onClick={() => openSaveQueryModal(selectedMetric.customId)}
                iconType="pencil"
                size="s"
              >
                {i18n.translate('xpack.infra.esqlInventory.editor.editCustomMetric', {
                  defaultMessage: 'Edit',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
