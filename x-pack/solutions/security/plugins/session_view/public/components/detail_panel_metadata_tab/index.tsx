/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ProcessEventHost,
  ProcessEventContainer,
  ProcessEventOrchestrator,
  ProcessEventCloud,
} from '../../../common';
import { DetailPanelAccordion } from '../detail_panel_accordion';
import { DetailPanelCopy } from '../detail_panel_copy';
import { DetailPanelListItem } from '../detail_panel_list_item';
import { useStyles as useStylesChild } from './styles';
import { getHostData, getContainerData, getOrchestratorData, getCloudData } from './helpers';

interface DetailPanelMetadataTabDeps {
  processHost?: ProcessEventHost;
  processContainer?: ProcessEventContainer;
  processOrchestrator?: ProcessEventOrchestrator;
  processCloud?: ProcessEventCloud;
}

/**
 * Host Panel of  session view detail panel.
 */
export const DetailPanelMetadataTab = ({
  processHost,
  processContainer,
  processOrchestrator,
  processCloud,
}: DetailPanelMetadataTabDeps) => {
  const stylesChild = useStylesChild();
  const hostData = useMemo(() => getHostData(processHost), [processHost]);
  const containerData = useMemo(() => getContainerData(processContainer), [processContainer]);
  const orchestratorData = useMemo(
    () => getOrchestratorData(processOrchestrator),
    [processOrchestrator]
  );
  const cloudData = useMemo(() => getCloudData(processCloud), [processCloud]);

  return (
    <>
      <DetailPanelAccordion
        id="metadataHost"
        title={i18n.translate('xpack.sessionView.metadataDetailsTab.metadataHost', {
          defaultMessage: 'Host',
        })}
        initialIsOpen={true}
        listItems={[
          {
            title: <DetailPanelListItem>id</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`host.id: "${hostData.id}"`}
                tooltipContent={hostData.id}
              >
                {hostData.id}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>hostname</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`host.hostname: "${hostData.hostname}"`}
                tooltipContent={hostData.hostname}
              >
                {hostData.hostname}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>ip</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`host.ip: "${hostData.ip}"`}
                tooltipContent={hostData.ip}
              >
                {hostData.ip}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>mac</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`host.mac: "${hostData.mac}"`}
                tooltipContent={hostData.mac}
              >
                {hostData.mac}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>name</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`host.name: "${hostData.name}"`}
                tooltipContent={hostData.name}
              >
                {hostData.name}
              </DetailPanelCopy>
            ),
          },
        ]}
      >
        <EuiPanel
          hasShadow={false}
          color="plain"
          hasBorder={false}
          borderRadius="m"
          paddingSize="none"
          css={stylesChild.metadataHostOS}
        >
          <DetailPanelAccordion
            id="hostOS"
            title={i18n.translate('xpack.sessionView.metadataDetailsTab.host', {
              defaultMessage: 'OS',
            })}
            listItems={[
              {
                title: <DetailPanelListItem>architecture</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.architecture: "${hostData.architecture}"`}
                    tooltipContent={hostData.architecture}
                  >
                    {hostData.architecture}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.family</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.family: "${hostData.os.family}"`}
                    tooltipContent={hostData.os.family}
                  >
                    {hostData.os.family}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.full</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.full: "${hostData.os.full}"`}
                    tooltipContent={hostData.os.full}
                  >
                    {hostData.os.full}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.kernel</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.kernel: "${hostData.os.kernel}"`}
                    tooltipContent={hostData.os.kernel}
                  >
                    {hostData.os.kernel}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.name: "${hostData.os.name}"`}
                    tooltipContent={hostData.os.name}
                  >
                    {hostData.os.name}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.platform</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.platform: "${hostData.os.platform}"`}
                    tooltipContent={hostData.os.platform}
                  >
                    {hostData.os.platform}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.version</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.version: "${hostData.os.version}"`}
                    tooltipContent={hostData.os.version}
                  >
                    {hostData.os.version}
                  </DetailPanelCopy>
                ),
              },
            ]}
          />
        </EuiPanel>
      </DetailPanelAccordion>

      {processCloud && (
        <>
          <DetailPanelAccordion
            id="metadataCloud"
            title={i18n.translate('xpack.sessionView.metadataDetailsTab.cloud', {
              defaultMessage: 'Cloud',
            })}
            listItems={[
              {
                title: <DetailPanelListItem>instance.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`cloud.provider: "${cloudData.instance.name}"`}
                    tooltipContent={cloudData.instance.name}
                  >
                    {cloudData.instance.name}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>provider</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`cloud.provider: "${cloudData.provider}"`}
                    tooltipContent={cloudData.provider}
                  >
                    {cloudData.provider}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>region</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`cloud.region: "${cloudData.region}"`}
                    tooltipContent={cloudData.region}
                  >
                    {cloudData.region}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>account.id</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`cloud.account.id: "${cloudData.account.id}"`}
                    tooltipContent={cloudData.account.id}
                  >
                    {cloudData.account.id}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>project.id</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`cloud.project.id: "${cloudData.project.id}"`}
                    tooltipContent={cloudData.project.id}
                  >
                    {cloudData.project.id}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>project.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`cloud.project.name: "${cloudData.project.name}"`}
                    tooltipContent={cloudData.project.name}
                  >
                    {cloudData.project.name}
                  </DetailPanelCopy>
                ),
              },
            ]}
          />
        </>
      )}
      {processContainer && (
        <>
          <DetailPanelAccordion
            id="metadataContainer"
            title={i18n.translate('xpack.sessionView.metadataDetailsTab.container', {
              defaultMessage: 'Container',
            })}
            listItems={[
              {
                title: <DetailPanelListItem>id</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.id: "${containerData.id}"`}
                    tooltipContent={containerData.id}
                  >
                    {containerData.id}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.name: "${containerData.name}"`}
                    tooltipContent={containerData.name}
                  >
                    {containerData.name}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>image.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.image.name: "${containerData.image.name}"`}
                    tooltipContent={containerData.image.name}
                  >
                    {containerData.image.name}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>image.tag</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.image.tag: "${containerData.image.tag}"`}
                    tooltipContent={containerData.image.tag}
                  >
                    {containerData.image.tag}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>image.hash.all</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.image.hash.all: "${containerData.image.hash.all}"`}
                    tooltipContent={containerData.image.hash.all}
                  >
                    {containerData.image.hash.all}
                  </DetailPanelCopy>
                ),
              },
            ]}
          />
        </>
      )}
      {processOrchestrator && (
        <>
          <DetailPanelAccordion
            id="metadataOrchestrator"
            title={i18n.translate('xpack.sessionView.metadataDetailsTab.orchestrator', {
              defaultMessage: 'Orchestrator',
            })}
            listItems={[
              {
                title: <DetailPanelListItem>resource.ip</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.resource.ip: "${orchestratorData.resource.ip}"`}
                    tooltipContent={orchestratorData.resource.ip}
                  >
                    {orchestratorData.resource.ip}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>resource.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.resource.name: "${orchestratorData.resource.name}"`}
                    tooltipContent={orchestratorData.resource.name}
                  >
                    {orchestratorData.resource.name}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>resource.type</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.resource.type: "${orchestratorData.resource.type}"`}
                    tooltipContent={orchestratorData.resource.type}
                  >
                    {orchestratorData.resource.type}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>resource.parent.type</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.resource.parent.type: "${orchestratorData.resource.parent.type}"`}
                    tooltipContent={orchestratorData.resource.parent.type}
                  >
                    {orchestratorData.resource.parent.type}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>namespace</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.namespace: "${orchestratorData.namespace}"`}
                    tooltipContent={orchestratorData.namespace}
                  >
                    {orchestratorData.namespace}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>cluster.id</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.cluster.id: "${orchestratorData.cluster.id}"`}
                    tooltipContent={orchestratorData.cluster.id}
                  >
                    {orchestratorData.cluster.id}
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>cluster.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.cluster.name: "${orchestratorData.cluster.name}"`}
                    tooltipContent={orchestratorData.cluster.name}
                  >
                    {orchestratorData.cluster.name}
                  </DetailPanelCopy>
                ),
              },
            ]}
          />
        </>
      )}
    </>
  );
};
