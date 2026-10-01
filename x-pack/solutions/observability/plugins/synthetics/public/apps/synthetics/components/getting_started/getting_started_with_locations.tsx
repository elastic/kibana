/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory, useLocation } from 'react-router-dom';
import { MONITOR_ADD_ROUTE } from '../../../../../common/constants/ui';
import { kibanaService } from '../../../../utils/kibana_service';
import { SimpleMonitorForm } from './simple_monitor_form';

export const GettingStartedWithLocations = () => {
  const history = useHistory();
  const { search } = useLocation();
  const projectMonitorsDocs =
    kibanaService.coreStart?.docLinks?.links?.observability?.syntheticsProjectMonitors;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="l"
      data-test-subj="syntheticsGettingStartedWithLocations"
    >
      <EuiFlexItem>
        <EuiTitle size="m">
          <h2>{CREATE_FIRST_MONITOR_LABEL}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          {INTRO_LABEL}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l" alignItems="flexStart">
          <EuiFlexItem grow={3}>
            <EuiPanel hasBorder paddingSize="l">
              <EuiTitle size="s">
                <h3>{QUICK_START_TITLE}</h3>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                {QUICK_START_DESCRIPTION}
              </EuiText>
              <EuiSpacer />
              <SimpleMonitorForm />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <EuiCard
                  hasBorder
                  layout="horizontal"
                  titleSize="xs"
                  icon={<EuiIcon type="apps" size="l" aria-hidden={true} />}
                  title={CHOOSE_TYPE_TITLE}
                  description={CHOOSE_TYPE_DESCRIPTION}
                  data-test-subj="syntheticsGettingStartedPageLink"
                  href={history.createHref({ pathname: MONITOR_ADD_ROUTE, search })}
                />
              </EuiFlexItem>
              {projectMonitorsDocs ? (
                <EuiFlexItem>
                  <EuiCard
                    hasBorder
                    layout="horizontal"
                    titleSize="xs"
                    icon={<EuiIcon type="editorCodeBlock" size="l" aria-hidden={true} />}
                    title={MONITORS_AS_CODE_TITLE}
                    description={MONITORS_AS_CODE_DESCRIPTION}
                    data-test-subj="syntheticsGettingStartedProjectMonitorsLink"
                    href={projectMonitorsDocs}
                    target="_blank"
                  />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          {ALERTS_HINT}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const CREATE_FIRST_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.gettingStarted.createFirstMonitor.title',
  { defaultMessage: 'Create your first monitor' }
);

const INTRO_LABEL = i18n.translate('xpack.synthetics.gettingStarted.createFirstMonitor.intro', {
  defaultMessage:
    'Synthetic monitoring checks the availability and performance of your sites and services from locations around the world.',
});

const QUICK_START_TITLE = i18n.translate('xpack.synthetics.gettingStarted.quickStart.title', {
  defaultMessage: 'Monitor a single page',
});

const QUICK_START_DESCRIPTION = i18n.translate(
  'xpack.synthetics.gettingStarted.quickStart.description',
  {
    defaultMessage:
      'Enter a URL and pick a location to create a single page browser monitor in seconds.',
  }
);

const CHOOSE_TYPE_TITLE = i18n.translate('xpack.synthetics.gettingStarted.chooseType.title', {
  defaultMessage: 'Choose a monitor type',
});

const CHOOSE_TYPE_DESCRIPTION = i18n.translate(
  'xpack.synthetics.gettingStarted.chooseType.description',
  {
    defaultMessage:
      'Configure HTTP, TCP, ICMP or browser monitors with schedules, locations and advanced options.',
  }
);

const MONITORS_AS_CODE_TITLE = i18n.translate(
  'xpack.synthetics.gettingStarted.monitorsAsCode.title',
  { defaultMessage: 'Manage monitors as code' }
);

const MONITORS_AS_CODE_DESCRIPTION = i18n.translate(
  'xpack.synthetics.gettingStarted.monitorsAsCode.description',
  {
    defaultMessage:
      'Define monitors in a project and push them from your repository or CI pipeline.',
  }
);

const ALERTS_HINT = i18n.translate('xpack.synthetics.gettingStarted.alertsHint', {
  defaultMessage: 'Once you have a monitor, you can set up alerts and rules from the page header.',
});
