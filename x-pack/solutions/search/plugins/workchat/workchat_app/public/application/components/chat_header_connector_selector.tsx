/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useCallback } from 'react';
import { EuiSuperSelect, EuiText, useEuiTheme, EuiSuperSelectOption } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { css } from '@emotion/css';
import { useConnectors } from '../hooks/use_connectors';

const selectInputDisplayClassName = css`
  margin-right: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

interface ChatHeaderConnectorSelectorProps {
  connectorId: string | undefined;
  onConnectorChange: (connectorId: string) => void;
}

export const ChatHeaderConnectorSelector: React.FC<ChatHeaderConnectorSelectorProps> = ({
  connectorId,
  onConnectorChange,
}) => {
  const { connectors } = useConnectors();
  const { euiTheme } = useEuiTheme();
  const [lastSelectedConnectorId, setLastSelectedConnectorId] = useLocalStorage<string>(
    'workchat.lastSelectedConnectorId'
  );

  useEffect(() => {
    if (connectors.length && !connectorId) {
      onConnectorChange(lastSelectedConnectorId ?? connectors[0].connectorId);
    }
  }, [connectorId, connectors, onConnectorChange, lastSelectedConnectorId]);

  const onValueChange = useCallback(
    (newConnectorId: string) => {
      onConnectorChange(newConnectorId);
      setLastSelectedConnectorId(newConnectorId);
    },
    [onConnectorChange, setLastSelectedConnectorId]
  );

  const options = useMemo(() => {
    return connectors.map<EuiSuperSelectOption<string>>((connector) => {
      return {
        value: connector.connectorId,
        inputDisplay: (
          <EuiText
            className={selectInputDisplayClassName}
            size="s"
            color={euiTheme.colors.textPrimary}
          >
            {connector.name}
          </EuiText>
        ),
      };
    });
  }, [connectors, euiTheme]);

  return (
    <EuiSuperSelect
      compressed={true}
      data-test-subj="connector-selector"
      hasDividers={true}
      options={options}
      valueOfSelected={connectorId}
      onChange={onValueChange}
      popoverProps={{ panelMinWidth: 250, anchorPosition: 'downRight' }}
    />
  );
};
