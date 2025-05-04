/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiWrappingPopover } from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { StatefulTopN } from '../../../common/components/top_n';
import { getScopeFromPath } from '../../../sourcerer/containers/sourcerer_paths';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useKibana } from '../../../common/lib/kibana';
import { useDataViewSpec } from '../../../data_view_manager/hooks/use_data_view_spec';
import { useBrowserFields } from '../../../data_view_manager/hooks/use_browser_fields';

export const TopValuesPopover = React.memo(() => {
  const { pathname } = useLocation();
  const sourcererScope = getScopeFromPath(pathname);
  const { browserFields: oldBrowserFields, sourcererDataView: oldSourcererDataView } =
    useSourcererDataView(sourcererScope);

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const { dataViewSpec } = useDataViewSpec(sourcererScope);
  const experimentalBrowserFields = useBrowserFields(sourcererScope);

  const sourcererDataView = newDataViewPickerEnabled ? dataViewSpec : oldSourcererDataView;
  const browserFields = newDataViewPickerEnabled ? experimentalBrowserFields : oldBrowserFields;

  const {
    services: { topValuesPopover },
  } = useKibana();
  const data = useObservable(topValuesPopover.getObservable());

  const onClose = useCallback(() => {
    topValuesPopover.closePopover();
  }, [topValuesPopover]);

  if (!data || !data.nodeRef) return null;

  return (
    <EuiWrappingPopover
      isOpen
      button={data.nodeRef}
      closePopover={onClose}
      anchorPosition={'downCenter'}
      hasArrow={false}
      repositionOnScroll
      ownFocus
      attachToAnchor={false}
    >
      <StatefulTopN
        field={data.fieldName}
        showLegend
        scopeId={data.scopeId}
        toggleTopN={onClose}
        dataViewSpec={sourcererDataView}
        browserFields={browserFields}
      />
    </EuiWrappingPopover>
  );
});

TopValuesPopover.displayName = 'TopValuesPopover';
