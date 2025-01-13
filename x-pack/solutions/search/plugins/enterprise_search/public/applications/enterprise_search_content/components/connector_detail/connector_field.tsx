/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexItem, EuiInlineEditText, EuiInlineEditTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { Connector } from '@kbn/search-connectors';

import { ConnectorNameAndDescriptionLogic } from './connector_name_and_description_logic';

interface ConnectorFieldProps {
  connector: Connector;
  field: 'name' | 'description'; // The field to edit
  isTitle?: boolean; // Whether to render a title (`EuiInlineEditTitle`) or text (`EuiInlineEditText`)
}

export const ConnectorField: React.FC<ConnectorFieldProps> = ({ connector, field, isTitle }) => {
  const [value, setValue] = useState<string | null>(connector[field]);
  const [resolverObject, setResolverObject] = useState({
    rej: () => {},
    res: () => {},
  });
  const { saveNameAndDescription, setConnector } = useActions(ConnectorNameAndDescriptionLogic);
  const { status, isLoading, isFailed, isSuccess } = useValues(ConnectorNameAndDescriptionLogic);

  useEffect(() => {
    setConnector(connector);
  }, [connector]);

  useEffect(() => {
    if (isSuccess) resolverObject.res();
    if (isFailed) resolverObject.rej();
  }, [status]);

  const getValidationPromiseResolvers = () => {
    const resolvers = {
      rej: () => {},
      res: () => {},
    };
    const promise = new Promise<void>((resolve, reject) => {
      resolvers.res = resolve;
      resolvers.rej = reject;
    });
    setResolverObject(resolvers);
    return promise;
  };

  const handleSave = async (newValue: string) => {
    setValue(newValue);
    saveNameAndDescription({ ...connector, [field]: newValue });
    await getValidationPromiseResolvers();
    return true;
  };

  const handleCancel = (previousValue: string) => {
    setValue(previousValue);
  };

  const Component = isTitle ? EuiInlineEditTitle : EuiInlineEditText;

  return (
    <EuiFlexItem grow={false}>
      <Component
        inputAriaLabel={i18n.translate(
          `xpack.enterpriseSearch.content.connectors.nameAndDescription.${field}.ariaLabel`,
          {
            defaultMessage: `Edit connector ${field}`,
          }
        )}
        placeholder={i18n.translate(
          `xpack.enterpriseSearch.content.connectors.nameAndDescription.${field}.placeholder`,
          {
            defaultMessage: field === 'name' ? 'Add a name to your connector' : 'Add a description',
          }
        )}
        value={value || ''}
        isLoading={isLoading}
        isInvalid={field === 'name' && !value?.trim()}
        size="m"
        heading={isTitle ? 'h1' : 'span'}
        editModeProps={{
          cancelButtonProps: { onClick: () => handleCancel(connector[field] || '') },
          formRowProps:
            field === 'name' && !value?.trim()
              ? {
                  error: [
                    i18n.translate(
                      'xpack.enterpriseSearch.content.nameAndDescription.name.error.empty',
                      { defaultMessage: 'Connector name cannot be empty' }
                    ),
                  ],
                }
              : undefined,
          inputProps: { readOnly: isLoading },
        }}
        onSave={handleSave}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        onCancel={() => handleCancel(connector[field] || '')}
      />
    </EuiFlexItem>
  );
};
