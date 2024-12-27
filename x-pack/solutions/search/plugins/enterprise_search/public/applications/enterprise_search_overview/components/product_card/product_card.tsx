/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';
import { snakeCase } from 'lodash';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  IconType,
  IconSize,
} from '@elastic/eui';

import { EuiButtonTo, EuiButtonEmptyTo } from '../../../shared/react_router_helpers';
import { TelemetryLogic } from '../../../shared/telemetry';

import './product_card.scss';

export interface ProductCardProps {
  cta?: string;
  description: string;
  emptyCta?: boolean;
  hasBorder?: boolean;
  hasShadow?: boolean;
  icon: IconType;
  iconSize?: IconSize;
  name: string;
  productId: string;
  rightPanelItems?: React.ReactNode[];
  url?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  cta,
  description,
  emptyCta = false,
  hasBorder,
  hasShadow,
  icon,
  iconSize,
  productId,
  rightPanelItems,
  name,
  url,
}) => {
  const { sendEnterpriseSearchTelemetry } = useActions(TelemetryLogic);

  return (
    <EuiPanel
      hasBorder={hasBorder ?? true}
      hasShadow={hasShadow ?? true}
      paddingSize="l"
      data-test-subj={`${productId}ProductCard`}
      className="productCard"
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false} data-test-subj="productCard-icon">
          <EuiIcon size={iconSize ?? 'xl'} type={icon} />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="productCard-details">
          <EuiTitle size="s">
            <h3>{name}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued" size="s">
            {description}{' '}
          </EuiText>{' '}
          <EuiSpacer />
          {cta && url && (
            <div>
              {emptyCta ? (
                <EuiButtonTo
                  to={url}
                  shouldNotCreateHref
                  onClick={() =>
                    sendEnterpriseSearchTelemetry({
                      action: 'clicked',
                      metric: snakeCase(productId),
                    })
                  }
                >
                  {cta}
                </EuiButtonTo>
              ) : (
                <EuiButtonEmptyTo
                  flush="both"
                  to={url}
                  shouldNotCreateHref
                  onClick={() =>
                    sendEnterpriseSearchTelemetry({
                      action: 'clicked',
                      metric: snakeCase(productId),
                    })
                  }
                >
                  {cta}
                </EuiButtonEmptyTo>
              )}
            </div>
          )}
        </EuiFlexItem>
        {rightPanelItems ? (
          <EuiFlexItem>
            <EuiFlexGroup
              direction="column"
              gutterSize="m"
              data-test-subj="productCard-rightPanelItems"
            >
              {rightPanelItems.map((rightPanelItem, id) => {
                return <EuiFlexItem key={id}>{rightPanelItem}</EuiFlexItem>;
              })}
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
