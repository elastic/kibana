/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseMutateAsyncFunction } from '@kbn/react-query';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ComponentStatus } from '../../../common/constants';
import { ComponentRow } from './component_row';

export function Setup({
  components,
  needsInstall,
  isInstalling,
  notifications,
  repair,
  refetch,
  repairingId,
  runIntrospect,
  isRunningIntrospect,
}: {
  components: ComponentStatus[];
  needsInstall: boolean;
  isInstalling: boolean;
  notifications: NotificationsStart;
  repair: UseMutateAsyncFunction<unknown, unknown, string, unknown>;
  refetch: any;
  repairingId: string | null;
  runIntrospect: () => Promise<unknown>;
  isRunningIntrospect: boolean;
}) {
  const handleRepair = async (componentId: string) => {
    try {
      await repair(componentId);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.errorSentry.overview.repairSuccess', {
          defaultMessage: 'Repaired successfully.',
        })
      );
    } catch (err) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.errorSentry.overview.repairFailed', {
          defaultMessage: 'Repair failed. Please try again.',
        })
      );
    }
  };

  return (
    <>
      {needsInstall && !isInstalling && (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="wrench"
            title={i18n.translate('xpack.errorSentry.overview.needsSetup', {
              defaultMessage: 'Some components need attention',
            })}
          >
            <FormattedMessage
              id="xpack.errorSentry.overview.needsSetupBody"
              defaultMessage="Click Install to deploy all Error Sentry workflows, or use individual Repair buttons below."
            />
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}

      {!needsInstall && (
        <>
          <EuiCallOut
            announceOnMount
            color="primary"
            iconType="checkCircleFill"
            title={i18n.translate('xpack.errorSentry.overview.installed', {
              defaultMessage: 'Error Sentry is set up successfully',
            })}
          >
            <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow>
                <FormattedMessage
                  id="xpack.errorSentry.overview.needsSetupBody"
                  defaultMessage="All components are correctly installed."
                />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiLink onClick={() => refetch()} data-test-subj="errorSentryRefresh">
                  <FormattedMessage
                    id="xpack.errorSentry.overview.refreshLabel"
                    defaultMessage="Refresh"
                  />
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}

      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
        {CATEGORY_ORDER.map((category, catIndex) => {
          const items = components.filter((c) => COMPONENT_CATEGORY[c.id] === category);

          if (items.length === 0) return null;

          return (
            <React.Fragment key={category}>
              {catIndex > 0 && <EuiSpacer size="m" />}
              <EuiText size="xs" color="subdued">
                <strong>{CATEGORY_LABELS[category]}</strong>
              </EuiText>
              <EuiSpacer size="s" />

              {items.map((component, index) => (
                <React.Fragment key={component.id}>
                  {index > 0 && <EuiSpacer size="s" />}
                  <ComponentRow
                    component={component}
                    onRepair={handleRepair}
                    repairingId={repairingId}
                    actions={
                      component.id === 'log_source' ? (
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            size="s"
                            iconType="refresh"
                            onClick={runIntrospect}
                            isLoading={isRunningIntrospect}
                            data-test-subj="errorSentryRunIntrospect"
                          >
                            <FormattedMessage
                              id="xpack.errorSentry.setup.introspectLabel"
                              defaultMessage="Run Introspection"
                            />
                          </EuiButton>
                        </EuiFlexItem>
                      ) : undefined
                    }
                  />
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        })}
      </EuiPanel>
    </>
  );
}

type CategoryKey = 'scs' | 'log_sources' | 'workflows' | 'connectors' | 'agents';

const CATEGORY_ORDER: CategoryKey[] = ['log_sources', 'workflows', 'connectors', 'agents', 'scs'];

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  workflows: 'Workflows',
  connectors: 'Connectors',
  agents: 'Agents',
  scs: 'Semantic Code Search',
  log_sources: 'Log sources',
};

const COMPONENT_CATEGORY: Record<string, CategoryKey> = {
  step: 'workflows',
  workflow_capture: 'workflows',
  workflow_escalate_github: 'workflows',
  workflow_ask_ralph: 'workflows',
  workflow_introspect: 'workflows',
  workflow_ralph_investigation: 'workflows',
  github_connector: 'connectors',
  agent_ralph: 'agents',
  scs_repos: 'scs',
  scs_tools: 'scs',
  log_source: 'log_sources',
};
