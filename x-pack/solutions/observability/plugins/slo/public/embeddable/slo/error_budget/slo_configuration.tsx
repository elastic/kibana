/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { EmbeddableSloProps } from './types';
import { SloSelector } from '../alerts/slo_selector';

interface SloConfigurationProps {
  onCreate: (props: EmbeddableSloProps) => void;
  onCancel: () => void;
}

export function SloConfiguration({ onCreate, onCancel }: SloConfigurationProps) {
  const [selectedSlo, setSelectedSlo] = useState<EmbeddableSloProps>();
  const [hasError, setHasError] = useState(false);

  const onConfirmClick = () =>
    onCreate({
      sloId: selectedSlo?.sloId,
      sloInstanceId: selectedSlo?.sloInstanceId,
    });
  return (
    <EuiFlyout onClose={onCancel} style={{ minWidth: 550 }}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.slo.errorBudgetEmbeddable.config.sloSelector.headerTitle', {
              defaultMessage: 'Error budget burn down configuration',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <EuiFlexItem grow>
            <SloSelector
              singleSelection={true}
              hasError={hasError}
              onSelected={(slo) => {
                setHasError(slo === undefined);
                if (slo && 'id' in slo) {
                  setSelectedSlo({ sloId: slo.id, sloInstanceId: slo.instanceId });
                }
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty onClick={onCancel} data-test-subj="sloCancelButton">
            <FormattedMessage
              id="xpack.slo.sloEmbeddable.config.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="sloConfirmButton"
            isDisabled={!selectedSlo || hasError}
            onClick={onConfirmClick}
            fill
          >
            <FormattedMessage
              id="xpack.slo.embeddableSlo.config.confirmButtonLabel"
              defaultMessage="Confirm configurations"
            />
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
