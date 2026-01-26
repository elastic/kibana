/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useInventoryContext } from '../inventory_context';
import { LegendControls } from './legend_controls';

/**
 * Modal wrapper for LegendControls - color legend configuration.
 * Consumes InventoryContext directly.
 */
export const LegendModal: React.FC = () => {
  const { inventory, handleLegendChange, closeLegendModal } = useInventoryContext();

  return (
    <EuiModal
      onClose={closeLegendModal}
      style={{ width: 400 }}
      aria-label={i18n.translate('xpack.infra.esqlInventory.legend.modalAriaLabel', {
        defaultMessage: 'Color legend configuration',
      })}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.infra.esqlInventory.legend.modalTitle', {
            defaultMessage: 'Color Legend',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <LegendControls config={inventory.legend} onChange={handleLegendChange} />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton
          data-test-subj="infraEsqlInventoryLegendCloseButton"
          onClick={closeLegendModal}
          fill
        >
          {i18n.translate('xpack.infra.esqlInventory.legend.closeButton', {
            defaultMessage: 'Close',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
