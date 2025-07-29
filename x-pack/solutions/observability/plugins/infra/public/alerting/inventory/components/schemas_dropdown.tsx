/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiExpression, EuiPopover, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { EuiPopoverTitle, EuiButtonIcon } from '@elastic/eui';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';

interface WhenExpressionProps {
  value: DataSchemaFormat;
  options: { [key: string]: { text: string; value: DataSchemaFormat } };
  onChange: (value: DataSchemaFormat) => void;
  popupPosition?:
    | 'upCenter'
    | 'upLeft'
    | 'upRight'
    | 'downCenter'
    | 'downLeft'
    | 'downRight'
    | 'leftCenter'
    | 'leftUp'
    | 'leftDown'
    | 'rightCenter'
    | 'rightUp'
    | 'rightDown';
}

export const SchemaExpression = ({
  value,
  options,
  onChange,
  popupPosition,
}: WhenExpressionProps) => {
  const [schemaPopoverOpen, setSchemaPopoverOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiExpression
          data-test-subj="schemaExpression"
          description={i18n.translate(
            'xpack.infra.metrics.alertFlyout.expression.schema.descriptionLabel',
            {
              defaultMessage: 'Schema',
            }
          )}
          value={options[value].text}
          isActive={schemaPopoverOpen}
          onClick={() => {
            setSchemaPopoverOpen(true);
          }}
        />
      }
      isOpen={schemaPopoverOpen}
      closePopover={() => {
        setSchemaPopoverOpen(false);
      }}
      ownFocus
      anchorPosition={popupPosition ?? 'downLeft'}
    >
      <div>
        <ClosablePopoverTitle onClose={() => setSchemaPopoverOpen(false)}>
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.expression.schema.popoverTitle"
            defaultMessage="Schema"
          />
        </ClosablePopoverTitle>
        <EuiSelect
          aria-label={i18n.translate('xpack.infra.nodeTypeExpression.select.ariaLabel', {
            defaultMessage: 'Schema',
          })}
          data-test-subj="forExpressionSelect"
          value={value}
          fullWidth
          onChange={(e) => {
            onChange(e.target.value as DataSchemaFormat);
            setSchemaPopoverOpen(false);
          }}
          options={Object.values(options).map((o) => o)}
        />
      </div>
    </EuiPopover>
  );
};

interface ClosablePopoverTitleProps {
  children: JSX.Element;
  onClose: () => void;
}

export const ClosablePopoverTitle = ({ children, onClose }: ClosablePopoverTitleProps) => {
  return (
    <EuiPopoverTitle>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            data-test-subj="infraClosablePopoverTitleButton"
            iconType="cross"
            color="danger"
            aria-label={i18n.translate(
              'xpack.infra.metrics.expressionItems.components.closablePopoverTitle.closeLabel',
              {
                defaultMessage: 'Close',
              }
            )}
            onClick={() => onClose()}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopoverTitle>
  );
};
