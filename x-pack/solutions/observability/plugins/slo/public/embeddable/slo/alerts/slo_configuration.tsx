/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { SloSelector } from './slo_selector';
import type { AlertsCustomState, SloItem } from './types';

interface SloConfigurationProps {
  initialInput?: AlertsCustomState;
  onCreate: (props: AlertsCustomState) => void;
  onCancel: () => void;
}

export function SloConfiguration({ initialInput, onCreate, onCancel }: SloConfigurationProps) {
  const [selectedSlos, setSelectedSlos] = useState<SloItem[]>(initialInput?.slos ?? []);
  const [hasError, setHasError] = useState(false);

  const onConfirmClick = () => onCreate({ slos: selectedSlos });

  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'alertsConfigurationFlyout',
  });

  return (
    <EuiFlyout
      onClose={onCancel}
      css={css`
        min-width: 550px;
      `}
      aria-labelledby={flyoutTitleId}
    >
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id={flyoutTitleId}>
            {i18n.translate('xpack.slo.sloEmbeddable.config.sloSelector.headerTitle', {
              defaultMessage: 'Alerts configuration',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <EuiFlexItem grow>
            <SloSelector
              initialSlos={selectedSlos}
              hasError={hasError}
              singleSelection={false}
              onSelected={(slos) => {
                setHasError(slos === undefined);
                if (slos) {
                  setSelectedSlos(slos);
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
              id="xpack.slo.Embeddable.config.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="sloConfirmButton"
            isDisabled={!selectedSlos || selectedSlos.length === 0 || hasError}
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
