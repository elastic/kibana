/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect } from '@elastic/eui';
import { AgentIcon } from '@kbn/custom-icons';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import type { RumApplicationOption } from '../../../../../../common/rum_platform';
import { useLegacyUrlParams } from '../../../../../context/url_params_context/use_url_params';
import { mergeRumSearch } from '../../../../../utils/rum_search';
import { uxAppPath, uxTabSuffix } from '../../../../../utils/ux_app_path';
import { applicationsForFilter } from './applications_for_filter';

interface Props {
  applications?: RumApplicationOption[];
  loading: boolean;
}

const androidLabel = i18n.translate('xpack.ux.localFilters.titles.androidAriaLabel', {
  defaultMessage: 'Android',
});

function ApplicationOptionDisplay({ name, platform }: RumApplicationOption) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {platform === 'android' ? (
        <EuiFlexItem grow={false}>
          <AgentIcon agentName="android/java" size="s" title={androidLabel} />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false} className="eui-textTruncate">
        {name}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function ServiceNameFilter({ loading, applications }: Props) {
  const history = useHistory();
  const {
    urlParams: { serviceName: selectedServiceName },
  } = useLegacyUrlParams();

  const apps = useMemo(
    () => applicationsForFilter(applications, selectedServiceName),
    [applications, selectedServiceName]
  );

  const options = apps.map((application) => ({
    value: application.name,
    inputDisplay: <ApplicationOptionDisplay {...application} />,
    dropdownDisplay: <ApplicationOptionDisplay {...application} />,
  }));

  const updateServiceName = useCallback(
    (serviceN: string) => {
      const suffix = uxTabSuffix(history.location.pathname);
      history.push({
        ...history.location,
        pathname: serviceN ? uxAppPath(serviceN, suffix) : '/',
        search: mergeRumSearch(history.location.search, { serviceName: '' }),
      });
    },
    [history]
  );

  const applicationLabel = i18n.translate('xpack.ux.localFilters.titles.applicationLabel', {
    defaultMessage: 'Application',
  });

  return (
    <EuiSuperSelect
      data-test-subj="uxServiceNameFilterSelect"
      fullWidth
      compressed
      prepend={applicationLabel}
      aria-label={applicationLabel}
      isLoading={loading}
      data-cy="serviceNameFilter"
      options={options}
      valueOfSelected={
        selectedServiceName && apps.some((app) => app.name === selectedServiceName)
          ? selectedServiceName
          : undefined
      }
      placeholder={i18n.translate('xpack.ux.localFilters.titles.applicationPlaceholder', {
        defaultMessage: 'Select application',
      })}
      disabled={options.length === 0}
      onChange={(value) => {
        updateServiceName(value);
      }}
    />
  );
}

export { ServiceNameFilter };
