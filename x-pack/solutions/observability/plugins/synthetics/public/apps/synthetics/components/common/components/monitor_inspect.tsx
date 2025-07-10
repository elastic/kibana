/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';

import {
  EuiFlyout,
  EuiButton,
  EuiCodeBlock,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutFooter,
  EuiHorizontalRule,
  EuiSpacer,
  EuiFlyoutBody,
  EuiToolTip,
  EuiSwitch,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import yaml from 'js-yaml';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { LoadingState } from '../../monitors_page/overview/overview/monitor_detail_flyout';
import { MonitorTypeEnum, SyntheticsMonitor } from '../../../../../../common/runtime_types';
import { inspectMonitorAPI, MonitorInspectResponse } from '../../../state/monitor_management/api';

interface InspectorProps {
  isValid: boolean;
  monitorFields: SyntheticsMonitor;
}

export const MonitorInspect = ({ isValid, monitorFields }: InspectorProps) => {
  const { isDev } = useSyntheticsSettingsContext();

  const [hideParams, setHideParams] = useState(() => !isDev);
  const [asJson, setAsJson] = useState(false);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const closeFlyout = () => {
    setIsFlyoutVisible(false);
    setIsInspecting(false);
  };

  const [isInspecting, setIsInspecting] = useState(false);
  const onButtonClick = () => {
    setIsInspecting(() => !isInspecting);
    setIsFlyoutVisible(() => !isFlyoutVisible);
  };

  const { data, loading, error } = useFetcher(() => {
    if (isInspecting) {
      return inspectMonitorAPI({
        hideParams,
        monitor: monitorFields,
      });
    }
    // FIXME: Dario couldn't find a solution for monitorFields
    // which is not memoized downstream
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInspecting, hideParams]);

  let flyout;

  if (isFlyoutVisible) {
    flyout = (
      <EuiFlyout ownFocus onClose={closeFlyout} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="flyoutTitle">{CONFIG_LABEL}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiSwitch
                compressed
                label={HIDE_PARAMS}
                checked={hideParams}
                onChange={(e) => setHideParams(e.target.checked)}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSwitch
                compressed
                label={AS_JSON}
                checked={asJson}
                onChange={(e) => setAsJson(e.target.checked)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />
          {!loading && data ? (
            <>
              <EuiCodeBlock
                language={asJson ? 'json' : 'yaml'}
                fontSize="m"
                paddingSize="m"
                lineNumbers
                isCopyable={true}
              >
                {formatContent(data.result, asJson)}
              </EuiCodeBlock>
              {data.decodedCode && <MonitorCode code={data.decodedCode} />}
            </>
          ) : loading && !error ? (
            <LoadingState />
          ) : (
            <p>{error?.message}</p>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButton
            data-test-subj="syntheticsMonitorInspectCloseButton"
            onClick={closeFlyout}
            fill
          >
            {CLOSE_LABEL}
          </EuiButton>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
  return (
    <>
      <EuiToolTip content={isValid ? FORMATTED_CONFIG_DESCRIPTION : VALID_CONFIG_LABEL}>
        <EuiButton
          disabled={!isValid}
          data-test-subj="syntheticsMonitorInspectShowFlyoutExampleButton"
          onClick={onButtonClick}
          iconType="inspect"
          iconSide="left"
        >
          {INSPECT_MONITOR_LABEL}
        </EuiButton>
      </EuiToolTip>

      {flyout}
    </>
  );
};

// @ts-ignore: Unused variable
// tslint:disable-next-line: no-unused-variable
const MonitorCode = ({ code }: { code: string }) => (
  <>
    <EuiHorizontalRule />
    <EuiTitle size="s">
      <h2 id="flyoutTitle">{SOURCE_CODE_LABEL}</h2>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiCodeBlock language="javascript" fontSize="m" paddingSize="m" lineNumbers isCopyable={true}>
      {code}
    </EuiCodeBlock>
  </>
);

const formatContent = (result: MonitorInspectResponse, asJson: boolean) => {
  const firstResult = result.publicConfigs?.[0]?.monitors?.[0];

  const currentInput = result.privateConfig?.inputs.find((input) => input.enabled);
  const compiledConfig = currentInput?.streams.find((stream) =>
    Object.values(MonitorTypeEnum).includes(stream.data_stream.dataset as MonitorTypeEnum)
  )?.compiled_stream;

  const data = { publicConfig: firstResult ?? {}, privateConfig: compiledConfig ?? {} };
  if (!asJson) {
    return yaml.dump(data);
  }

  return JSON.stringify(data, null, 2);
};

const CONFIG_LABEL = i18n.translate('xpack.synthetics.monitorInspect.configLabel', {
  defaultMessage: 'Configuration',
});

const VALID_CONFIG_LABEL = i18n.translate(
  'xpack.synthetics.monitorInspect.formattedConfigLabel.valid',
  {
    defaultMessage: 'Only valid form configurations can be inspected.',
  }
);

const FORMATTED_CONFIG_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorInspect.formattedConfigLabel.description',
  {
    defaultMessage: 'View formatted configuration for this monitor.',
  }
);
const CLOSE_LABEL = i18n.translate('xpack.synthetics.monitorInspect.closeLabel', {
  defaultMessage: 'Close',
});

export const SOURCE_CODE_LABEL = i18n.translate('xpack.synthetics.monitorInspect.sourceCodeLabel', {
  defaultMessage: 'Source code',
});

export const INSPECT_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.monitorInspect.inspectLabel',
  {
    defaultMessage: 'Inspect configuration',
  }
);

const HIDE_PARAMS = i18n.translate('xpack.synthetics.monitorInspect.hideParams', {
  defaultMessage: 'Hide parameter values',
});

const AS_JSON = i18n.translate('xpack.synthetics.monitorInspect.asJson', {
  defaultMessage: 'As JSON',
});
