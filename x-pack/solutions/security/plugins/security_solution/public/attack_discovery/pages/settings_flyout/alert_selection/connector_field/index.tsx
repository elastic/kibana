/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantSpaceIdProvider, ConnectorSelectorInline } from '@kbn/elastic-assistant';
import { EuiFormRow, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { noop } from 'lodash/fp';
import React from 'react';

import { SpacerWithoutMarginCollapse } from '../../common/spacer_without_margin_collapse';
import * as i18n from '../translations';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';

interface Props {
  connectorId: string | undefined;
  onConnectorIdSelected?: (connectorId: string) => void;
  showDescription?: boolean;
}

const ConnectorFieldComponent: React.FC<Props> = ({
  connectorId,
  onConnectorIdSelected,
  showDescription = true,
}) => {
  const spaceId = useSpaceId();
  const { euiTheme } = useEuiTheme();

  if (!spaceId) {
    return null;
  }

  return (
    <AssistantSpaceIdProvider spaceId={spaceId}>
      {showDescription && (
        <>
          <EuiText data-test-subj="connectorFieldDescription" size="s">
            <p>{i18n.CUSTOMIZE_THE_CONNECTOR_AND_ALERTS}</p>
          </EuiText>

          <SpacerWithoutMarginCollapse size="l" />
        </>
      )}

      <EuiFormRow
        css={css`
          flex-grow: 1;

          .euiButton {
            block-size: ${euiTheme.size.xxl};
          }
        `}
        label={i18n.CONNECTOR}
      >
        <ConnectorSelectorInline
          fullWidth={true}
          onConnectorIdSelected={onConnectorIdSelected}
          onConnectorSelected={noop}
          selectedConnectorId={connectorId}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />
    </AssistantSpaceIdProvider>
  );
};

ConnectorFieldComponent.displayName = 'ConnectorField';

export const ConnectorField = React.memo(ConnectorFieldComponent);
