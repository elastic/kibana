/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  useGeneratedHtmlId,
  EuiSwitch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormProvider, useForm } from 'react-hook-form';
import { MonitorFiltersForm } from './monitor_filters_form';
import type { OverviewView } from '../../synthetics/state';
import { DEFAULT_OVERVIEW_VIEW } from '../../synthetics/state';
import type { MonitorFilters } from '../../../../common/embeddables/stats_overview/types';

const MonitorConfigurationContext = React.createContext<{
  overviewView: OverviewView;
  onChangeCompactViewSwitch: (e: EuiSwitchEvent) => void;
}>({ overviewView: DEFAULT_OVERVIEW_VIEW, onChangeCompactViewSwitch: () => {} });

const COMPACT_VIEW_LABEL = i18n.translate(
  'xpack.synthetics.embeddables.monitorsOverview.compactViewLabel',
  { defaultMessage: 'Compact view' }
);

interface MonitorConfigurationProps {
  initialInput?: {
    filters: MonitorFilters;
    view?: OverviewView;
  };
  onCreate: (props: { filters: MonitorFilters; view: OverviewView }) => void;
  onCancel: () => void;
  title: string;
}

export function MonitorConfiguration({
  initialInput,
  onCreate,
  onCancel,
  title,
  children,
}: React.PropsWithChildren<MonitorConfigurationProps>) {
  const [overviewView, setOverviewView] = useState<OverviewView>(
    initialInput?.view || DEFAULT_OVERVIEW_VIEW
  );

  const onChangeCompactViewSwitch = (e: EuiSwitchEvent) => {
    setOverviewView(e.target.checked ? 'compactView' : 'cardView');
  };

  const methods = useForm<MonitorFilters>({
    defaultValues: {
      monitorIds: [],
      projects: [],
      tags: [],
      monitorTypes: [],
      locations: [],
    },
    values: initialInput?.filters,
    mode: 'all',
  });
  const { getValues, formState } = methods;
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'monitorConfigurationFlyout',
  });

  const onConfirmClick = () => {
    const newFilters = getValues();
    onCreate({
      filters: newFilters,
      view: overviewView,
    });
  };

  const hasViewChanged = initialInput?.view && overviewView !== initialInput.view;

  return (
    <EuiFlyout onClose={onCancel} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id={flyoutTitleId}>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow>
                <FormProvider {...methods}>
                  <MonitorFiltersForm />
                </FormProvider>
              </EuiFlexItem>
              <MonitorConfigurationContext.Provider
                value={{
                  overviewView,
                  onChangeCompactViewSwitch,
                }}
              >
                {children}
              </MonitorConfigurationContext.Provider>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty
            data-test-subj="syntheticsMonitorConfigurationCancelButton"
            onClick={onCancel}
          >
            <FormattedMessage
              id="xpack.synthetics.embeddable.config.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="syntheticsMonitorConfigurationSaveButton"
            isDisabled={!(formState.isDirty || !initialInput || hasViewChanged)}
            onClick={onConfirmClick}
            fill
          >
            <FormattedMessage
              id="xpack.synthetics.overviewEmbeddableSynthetics.config.confirmButtonLabel"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

function ViewSwitch() {
  const { onChangeCompactViewSwitch, overviewView } = React.useContext(MonitorConfigurationContext);
  return (
    <EuiSwitch
      compressed
      checked={overviewView === 'compactView'}
      label={COMPACT_VIEW_LABEL}
      onChange={onChangeCompactViewSwitch}
    />
  );
}

MonitorConfiguration.ViewSwitch = ViewSwitch;
