/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useProfilingPluginSetting } from '../../../../../hooks/use_profiling_integration_setting';
import { useTabSwitcherContext } from '../../../hooks/use_tab_switcher';

export function CpuProfilingPrompt() {
  const { showTab } = useTabSwitcherContext();
  const isProfilingPluginEnabled = useProfilingPluginSetting();

  if (!isProfilingPluginEnabled) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="flexStart"
      gutterSize="s"
      data-test-subj="infraAssetDetailsCPUProfilingPrompt"
    >
      <EuiFlexItem grow={false}>
        {i18n.translate('xpack.infra.cpuProfilingPrompt.promptText', {
          defaultMessage: 'View CPU Breakdown using',
        })}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="infraCpuProfilingPromptProfilingButton"
          onClick={() => showTab('profiling')}
          flush="both"
          aria-label={i18n.translate('xpack.infra.cpuProfilingPrompt.profilingButtonAriaLabel', {
            defaultMessage: 'Profiling',
          })}
        >
          {i18n.translate('xpack.infra.cpuProfilingPrompt.profilingLinkLabel', {
            defaultMessage: 'Profiling',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
