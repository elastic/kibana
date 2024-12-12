/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { enableInspectEsQueries } from '@kbn/observability-plugin/common';
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
} from '@elastic/eui';

import { ClientPluginsStart } from '../../../../../plugin';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { LoadingState } from '../../monitors_page/overview/overview/monitor_detail_flyout';
import { MonitorTypeEnum, SyntheticsMonitor } from '../../../../../../common/runtime_types';
import { inspectMonitorAPI, MonitorInspectResponse } from '../../../state/monitor_management/api';

interface InspectorProps {
  isValid: boolean;
  monitorFields: SyntheticsMonitor;
}
export const MonitorInspectWrapper = (props: InspectorProps) => {
  const {
    services: { uiSettings },
  } = useKibana<ClientPluginsStart>();

  const { isDev } = useSyntheticsSettingsContext();

  const isInspectorEnabled = uiSettings?.get<boolean>(enableInspectEsQueries);

  return isDev || isInspectorEnabled ? <MonitorInspect {...props} /> : null;
};

const MonitorInspect = ({ isValid, monitorFields }: InspectorProps) => {
  const { isDev } = useSyntheticsSettingsContext();

  const [hideParams, setHideParams] = useState(() => !isDev);
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
          <EuiSwitch
            label={HIDE_PARAMS}
            checked={hideParams}
            onChange={(e) => setHideParams(e.target.checked)}
          />
          <EuiSpacer size="m" />
          {!loading && data ? (
            <>
              <EuiCodeBlock
                language="json"
                fontSize="m"
                paddingSize="m"
                lineNumbers
                isCopyable={true}
              >
                {formatContent(data.result)}
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

const formatContent = (result: MonitorInspectResponse) => {
  const firstResult = result.publicConfigs?.[0]?.monitors?.[0];

  const currentInput = result.privateConfig?.inputs.find((input) => input.enabled);
  const compiledConfig = currentInput?.streams.find((stream) =>
    Object.values(MonitorTypeEnum).includes(stream.data_stream.dataset as MonitorTypeEnum)
  )?.compiled_stream;

  return JSON.stringify(
    { publicConfig: firstResult ?? {}, privateConfig: compiledConfig ?? {} },
    null,
    2
  );
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
