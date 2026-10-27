/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiIllustration } from '@elastic/eui';
import { analyticsSpeedAcceleration } from '@elastic/eui-illustrations';
import { css } from '@emotion/react';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { FormattedMessage } from '@kbn/i18n-react';
import { ENTITY_INVENTORY_EBT_ELEMENTS } from '../ebt_constants';
import type { EntityInventoryCategory } from '../pages';

interface NoDataProps {
  addDataHref: string;
  entityCategory: EntityInventoryCategory;
}

export function NoData({ addDataHref, entityCategory }: NoDataProps) {
  return (
    <EuiEmptyPrompt
      data-test-subj="entityInventoryNoData"
      icon={
        <EuiIllustration
          type={analyticsSpeedAcceleration}
          alt=""
          css={css`
            max-width: 200px;
          `}
        />
      }
      title={
        <h2>
          <FormattedMessage
            id="xpack.entityInventoryApp.noData.title"
            defaultMessage="Add Observability data"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.entityInventoryApp.noData.description"
            defaultMessage="Connect your systems and get full visibility into logs, metrics, and traces."
          />
        </p>
      }
      actions={
        <EuiButton
          fill
          iconType="plusCircle"
          href={addDataHref}
          data-test-subj="entityInventoryNoDataAddDataButton"
          {...getEbtProps({
            action: EBT_CLICK_ACTIONS.ADD_DATA,
            element: ENTITY_INVENTORY_EBT_ELEMENTS.NO_DATA,
            detail: entityCategory,
          })}
        >
          <FormattedMessage
            id="xpack.entityInventoryApp.noData.addDataButton"
            defaultMessage="Add data"
          />
        </EuiButton>
      }
    />
  );
}
