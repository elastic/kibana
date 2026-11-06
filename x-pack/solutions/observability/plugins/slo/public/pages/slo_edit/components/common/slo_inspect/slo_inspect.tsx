/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IngestPipelinesListParams } from '@kbn/ingest-pipelines-plugin/public';
import {
  INGEST_PIPELINES_APP_LOCATOR,
  INGEST_PIPELINES_PAGES,
} from '@kbn/ingest-pipelines-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import type { CreateSLOInput, GetSLOResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useFetchSloInspect } from '../../../../../hooks/use_fetch_slo_inspect';
import { useValidatedSloInput } from '../../../hooks/use_validated_slo_input';
import { CodeBlockAccordion } from './code_block_accordion';
import { LoadingState } from './loading_state';
import { RequestCodeViewer } from './req_code_viewer';

interface Props {
  slo?: GetSLOResponse;
  disabled: boolean;
}

export function SLOInspect({ slo, disabled }: Props) {
  const { share, http } = useKibana().services;
  const getValidatedSloInput = useValidatedSloInput();

  const [inspectInput, setInspectInput] = useState<CreateSLOInput>();
  const isFormValid = inspectInput !== undefined;
  const isFlyoutVisible = isFormValid;

  const { data: inspectSloData, isLoading } = useFetchSloInspect(inspectInput, isFlyoutVisible);

  const { data: summaryPipelineUrl } = useFetcher(async () => {
    const ingestPipeLocator = share.url.locators.get<IngestPipelinesListParams>(
      INGEST_PIPELINES_APP_LOCATOR
    );
    const ingestPipelineId = inspectSloData?.summaryPipeline?.id;
    return ingestPipeLocator?.getUrl({
      pipelineId: ingestPipelineId,
      page: INGEST_PIPELINES_PAGES.LIST,
    });
  }, [inspectSloData?.summaryPipeline?.id, share.url.locators]);

  const { data: rollUpPipelineUrl } = useFetcher(async () => {
    const ingestPipeLocator = share.url.locators.get<IngestPipelinesListParams>(
      INGEST_PIPELINES_APP_LOCATOR
    );
    const ingestPipelineId = inspectSloData?.rollUpPipeline?.id;
    return ingestPipeLocator?.getUrl({
      pipelineId: ingestPipelineId,
      page: INGEST_PIPELINES_PAGES.LIST,
    });
  }, [inspectSloData?.rollUpPipeline?.id, share.url.locators]);

  const closeFlyout = () => {
    setInspectInput(undefined);
  };

  const handleInspectButtonClick = async () => {
    const input = await getValidatedSloInput();
    setInspectInput(input && { ...input, id: slo?.id, revision: slo?.revision });
  };

  let flyout;
  if (isFlyoutVisible) {
    flyout = (
      <EuiFlyout ownFocus onClose={closeFlyout} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="flyoutTitle">
              {i18n.translate('xpack.slo.monitorInspect.configLabel', {
                defaultMessage: 'SLO Configurations',
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {isLoading && <LoadingState />}
          <EuiSpacer size="m" />
          {inspectSloData && (
            <>
              <CodeBlockAccordion
                id="slo"
                label={i18n.translate(
                  'xpack.slo.sLOInspect.codeBlockAccordion.sloConfigurationLabel',
                  { defaultMessage: 'SLO configuration' }
                )}
                json={inspectSloData.slo}
              />
              <EuiSpacer size="s" />
              <CodeBlockAccordion
                id="rollUpTransform"
                label={i18n.translate(
                  'xpack.slo.sLOInspect.codeBlockAccordion.rollupTransformLabel',
                  { defaultMessage: 'Rollup transform' }
                )}
                json={inspectSloData.rollUpTransform}
                extraAction={
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.slo.sLOInspect.viewRollupTransformButtonAriaLabel',
                      { defaultMessage: 'View rollup transform' }
                    )}
                    disableScreenReaderOutput
                  >
                    <EuiButtonIcon
                      iconType="link"
                      data-test-subj="o11ySLOInspectDetailsButton"
                      href={http?.basePath.prepend('/app/management/data/transform')}
                      aria-label={i18n.translate(
                        'xpack.slo.sLOInspect.viewRollupTransformButtonAriaLabel',
                        { defaultMessage: 'View rollup transform' }
                      )}
                    />
                  </EuiToolTip>
                }
              />
              <EuiSpacer size="s" />

              <CodeBlockAccordion
                id="summaryTransform"
                label={i18n.translate(
                  'xpack.slo.sLOInspect.codeBlockAccordion.summaryTransformLabel',
                  { defaultMessage: 'Summary transform' }
                )}
                json={inspectSloData.summaryTransform}
                extraAction={
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.slo.sLOInspect.viewSummaryTransformButtonAriaLabel',
                      { defaultMessage: 'View summary transform' }
                    )}
                    disableScreenReaderOutput
                  >
                    <EuiButtonIcon
                      iconType="link"
                      data-test-subj="o11ySLOInspectDetailsButton"
                      href={http?.basePath.prepend('/app/management/data/transform')}
                      aria-label={i18n.translate(
                        'xpack.slo.sLOInspect.viewSummaryTransformButtonAriaLabel',
                        { defaultMessage: 'View summary transform' }
                      )}
                    />
                  </EuiToolTip>
                }
              />
              <EuiSpacer size="s" />

              <CodeBlockAccordion
                id="rollupPipeline"
                label={i18n.translate(
                  'xpack.slo.sLOInspect.codeBlockAccordion.rollupIngestPipelineLabel',
                  { defaultMessage: 'Rollup ingest pipeline' }
                )}
                extraAction={
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.slo.sLOInspect.viewRollupPipelineButtonAriaLabel',
                      { defaultMessage: 'View rollup ingest pipeline' }
                    )}
                    disableScreenReaderOutput
                  >
                    <EuiButtonIcon
                      iconType="link"
                      data-test-subj="o11ySLOInspectDetailsButton"
                      href={rollUpPipelineUrl}
                      aria-label={i18n.translate(
                        'xpack.slo.sLOInspect.viewRollupPipelineButtonAriaLabel',
                        { defaultMessage: 'View rollup ingest pipeline' }
                      )}
                    />
                  </EuiToolTip>
                }
                json={inspectSloData.rollUpPipeline}
              />
              <EuiSpacer size="s" />

              <CodeBlockAccordion
                id="summaryPipeline"
                label={i18n.translate(
                  'xpack.slo.sLOInspect.codeBlockAccordion.summaryIngestPipelineLabel',
                  { defaultMessage: 'Summary ingest pipeline' }
                )}
                extraAction={
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.slo.sLOInspect.viewSummaryPipelineButtonAriaLabel',
                      { defaultMessage: 'View summary ingest pipeline' }
                    )}
                    disableScreenReaderOutput
                  >
                    <EuiButtonIcon
                      iconType="link"
                      data-test-subj="o11ySLOInspectDetailsButton"
                      href={summaryPipelineUrl}
                      aria-label={i18n.translate(
                        'xpack.slo.sLOInspect.viewSummaryPipelineButtonAriaLabel',
                        { defaultMessage: 'View summary ingest pipeline' }
                      )}
                    />
                  </EuiToolTip>
                }
                json={inspectSloData.summaryPipeline}
              />
              <EuiSpacer size="s" />

              <CodeBlockAccordion
                id="temporaryDoc"
                label={i18n.translate(
                  'xpack.slo.sLOInspect.codeBlockAccordion.temporaryDocumentLabel',
                  { defaultMessage: 'Temporary document' }
                )}
                json={inspectSloData.temporaryDoc}
              />
              <EuiSpacer size="s" />

              <CodeBlockAccordion
                id="rollupTransformQuery"
                label={i18n.translate(
                  'xpack.slo.sLOInspect.codeBlockAccordion.transformQueryLabel',
                  { defaultMessage: 'Rollup Transform query composite' }
                )}
              >
                <RequestCodeViewer value={inspectSloData.rollUpTransformCompositeQuery} />
              </CodeBlockAccordion>

              <EuiSpacer size="s" />

              <CodeBlockAccordion
                id="summmaryTransformQuery"
                label={i18n.translate(
                  'xpack.slo.sLOInspect.codeBlockAccordion.summaryTransformQueryLabel',
                  { defaultMessage: 'Summary Transform query composite' }
                )}
              >
                <RequestCodeViewer value={inspectSloData.summaryTransformCompositeQuery} />
              </CodeBlockAccordion>
            </>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButton
            data-test-subj="syntheticsMonitorInspectCloseButton"
            onClick={closeFlyout}
            fill
          >
            {i18n.translate('xpack.slo.sLOInspect.closeButtonLabel', {
              defaultMessage: 'Close',
            })}
          </EuiButton>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }

  return (
    <>
      <EuiToolTip
        content={
          isFormValid
            ? i18n.translate('xpack.slo.viewFormattedResourcesConfigsButtonLabel', {
                defaultMessage: 'View formatted resources configs for SLO',
              })
            : i18n.translate('xpack.slo.formattedConfigLabel.valid', {
                defaultMessage: 'Only valid form configurations can be inspected.',
              })
        }
        repositionOnScroll
      >
        <EuiButtonEmpty
          color="primary"
          data-test-subj="syntheticsMonitorInspectShowFlyoutExampleButton"
          onClick={handleInspectButtonClick}
          disabled={disabled}
          iconType="inspect"
          iconSide="left"
        >
          {i18n.translate('xpack.slo.sLOInspect.sLOInspectButtonLabel', {
            defaultMessage: 'SLO Inspect',
          })}
        </EuiButtonEmpty>
      </EuiToolTip>

      {flyout}
    </>
  );
}
