/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE, type SLOWithSummaryResponse } from '@kbn/slo-schema';
import { SLOS_BASE_PATH } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { SloGroupings } from './slo_groupings';
import { SloSelectInstanceFlyout } from './slo_select_instance_flyout';

export function SloInstance({ slo }: { slo: SLOWithSummaryResponse }) {
  const isFlyoutAvailable = window.location.pathname.includes(SLOS_BASE_PATH);

  const { search: searchParams } = useLocation();
  const history = useHistory();
  const [showSelectInstanceFlyout, setShowSelectInstanceFlyout] = useState(false);

  const groupBy = [slo.groupBy].flat();
  const isDefinedWithGroupBy = !groupBy.includes(ALL_VALUE);
  const groupings = Object.entries(slo.groupings ?? {});
  const noInstanceSelected = isDefinedWithGroupBy && groupings.length === 0;

  if (!isDefinedWithGroupBy) {
    return null;
  }

  const handleOnSelect = (instanceId: string) => {
    const urlSearchParams = new URLSearchParams(searchParams);
    urlSearchParams.set('instanceId', instanceId);
    history.push({
      search: urlSearchParams.toString(),
    });
  };

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        {noInstanceSelected ? (
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.slo.sloInstance.noInstanceSelectedTextLabel', {
              defaultMessage: 'No instance selected',
            })}
          </EuiText>
        ) : (
          <SloGroupings groupings={slo.groupings} />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          disabled={!isFlyoutAvailable}
          data-test-subj="sloOpenSelectInstanceFlyoutButton"
          iconType="search"
          aria-label={i18n.translate('xpack.slo.sloInstance.selectInstanceFlyoutLabel', {
            defaultMessage: 'Open instance selector flyout',
          })}
          color="primary"
          onClick={() => setShowSelectInstanceFlyout((prev) => !prev)}
        />
      </EuiFlexItem>
      {isFlyoutAvailable && showSelectInstanceFlyout && (
        <SloSelectInstanceFlyout
          slo={slo}
          onClose={() => setShowSelectInstanceFlyout(false)}
          onSelect={(instanceId: string) => {
            handleOnSelect(instanceId);
            setShowSelectInstanceFlyout(false);
          }}
        />
      )}
    </EuiFlexGroup>
  );
}
