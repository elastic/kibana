/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiCallOut,
  EuiContextMenu,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useEuiTheme,
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { css } from '@emotion/css';
import React, { ReactNode, useState } from 'react';
import {
  IngestStreamLifecycle,
  IngestUpsertRequest,
  ReadStreamDefinition,
  UnwiredReadStreamDefinition,
  WiredReadStreamDefinition,
  isDslLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
  isRoot,
  isUnwiredReadStream,
  isWiredReadStream,
} from '@kbn/streams-schema';
import { useKibana } from '../../hooks/use_kibana';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';

enum LifecycleEditAction {
  None,
  Dsl,
  Ilm,
  Inherit,
}

function useLifecycleState({ definition }: { definition?: ReadStreamDefinition }) {
  return {};
}

export function StreamDetailLifecycle({
  definition,
  refreshDefinition,
}: {
  definition?: WiredReadStreamDefinition | UnwiredReadStreamDefinition;
  refreshDefinition: () => void;
}) {
  const theme = useEuiTheme().euiTheme;
  const lifecycleAppState = useLifecycleState({ definition });

  const [openEditModal, setOpenEditModal] = useState(LifecycleEditAction.None);

  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  if (!definition) {
    return null;
  }
  const { signal } = useAbortController();

  const updateLifecycle = async (lifecycle: IngestStreamLifecycle) => {
    try {
      const request = {
        ingest: {
          ...definition.stream.ingest,
          lifecycle,
        },
      } as IngestUpsertRequest;

      await streamsRepositoryClient.fetch('PUT /api/streams/{id}/_ingest', {
        params: {
          path: { id: definition.name },
          body: request,
        },
        signal,
      });

      refreshDefinition();
    } catch (err) {}
  };

  return (
    <>
      <EditLifecycleModal
        action={openEditModal}
        definition={definition}
        closeModal={() => setOpenEditModal(LifecycleEditAction.None)}
        updateLifecycle={updateLifecycle}
      />

      <EuiFlexItem
        className={css`
          overflow: auto;
        `}
        grow={false}
      >
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          className={css`
            overflow: auto;
          `}
        >
          <EuiFlexItem>
            <EuiPanel
              hasShadow={false}
              hasBorder
              className={css`
                display: flex;
                max-width: 100%;
                overflow: auto;
                flex-grow: 1;
              `}
              paddingSize="s"
            >
              <EuiFlexGroup
                gutterSize="m"
                className={css`
                  overflow: auto;
                `}
              >
                <EuiFlexItem grow={1}>
                  <RetentionSummary definition={definition} />
                </EuiFlexItem>

                {isWiredReadStream(definition) ? (
                  <EuiFlexItem grow={4}>
                    <RetentionMetadata
                      definition={definition}
                      openEditModal={(action) => {
                        setOpenEditModal(action);
                      }}
                    />
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </>
  );
}

function RetentionSummary({ definition }: { definition: ReadStreamDefinition }) {
  const isWired = isWiredReadStream(definition);

  const summaryText = (() => {
    const lifecycle = definition.stream.ingest.lifecycle;
    if (isInheritLifecycle(lifecycle)) {
      return (
        <p>
          This data stream is using an inherit policy.
          <br />
          You can override it with a custom data retention or with an ILM policy.
        </p>
      );
    } else if (isDslLifecycle(lifecycle)) {
      return (
        <p>
          This data stream is using a custom data retention
          {isWired && !isRoot(definition.name) ? ' as an override at this level' : ''}.
          <br />
          {!isWired || isRoot(definition.name)
            ? 'You can modify it or use an ILM policy.'
            : 'You can modify it, use an ILM policy or inherit the retention of the nearest parent.'}
        </p>
      );
    } else if (isIlmLifecycle(lifecycle)) {
      return (
        <p>
          This data stream is using an ILM policy
          {isWired && !isRoot(definition.name) ? ' as an override at this level' : ''}.
          <br />
          {!isWired || isRoot(definition.name)
            ? 'You can modify it or use a custom data retention.'
            : 'You can modify it, use a custom data retention or inherit the retention of the nearest parent.'}
        </p>
      );
    }

    return (
      <p>
        The retention for this data stream is disabled.
        <br />
        You can set a custom data retention or use an ILM policy.
      </p>
    );
  })();

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      color="subdued"
      className={css`
        display: flex;
        max-width: 100%;
        overflow: auto;
        flex-grow: 1;
      `}
      paddingSize="s"
    >
      <EuiText>
        <h5>Retention summary</h5>
        {summaryText}
      </EuiText>
    </EuiPanel>
  );
}

function RetentionMetadata({
  definition,
  openEditModal,
}: {
  definition: WiredReadStreamDefinition;
  openEditModal: (action: LifecycleEditAction) => void;
}) {
  const [isMenuOpen, setMenuOpen] = useState(false);

  const Row = ({
    metadata,
    value,
    button,
  }: {
    metadata: string;
    value: string;
    action?: string;
    button?: ReactNode;
  }) => {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="xl">
        <EuiFlexItem grow={1}>
          <EuiText>
            <b>{metadata}</b>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={4}>
          <EuiText>{value}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>{button}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const lifecycle = definition.effective_lifecycle;

  const contextualMenu = (
    <EuiPopover
      button={
        <EuiButton size="s" fullWidth onClick={() => setMenuOpen(!isMenuOpen)}>
          Edit data retention
        </EuiButton>
      }
      isOpen={isMenuOpen}
      closePopover={() => setMenuOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            title: 'Manage data retention',
            items: [
              {
                name: 'Set specific retention days',
                onClick: () => {
                  setMenuOpen(false);
                  openEditModal(LifecycleEditAction.Dsl);
                },
              },
              ...(isUnwiredReadStream(definition)
                ? []
                : [
                    {
                      name: 'Use a lifecycle policy',
                      onClick: () => {
                        setMenuOpen(false);
                        openEditModal(LifecycleEditAction.Ilm);
                      },
                    },
                  ]),
              ...(isRoot(definition.name)
                ? []
                : [
                    {
                      name: 'Reset to default',
                      onClick: () => {
                        setMenuOpen(false);
                        openEditModal(LifecycleEditAction.Inherit);
                      },
                    },
                  ]),
            ],
          },
        ]}
      />
    </EuiPopover>
  );

  return (
    <EuiPanel hasBorder={false} hasShadow={false}>
      <Row
        metadata="Retention period"
        value={
          isDslLifecycle(lifecycle)
            ? lifecycle.dsl.data_retention ?? '∞'
            : isIlmLifecycle(lifecycle)
            ? 'Policy-based'
            : 'Disabled'
        }
        button={contextualMenu}
      />
      <EuiHorizontalRule margin="m" />
      <Row metadata="Source" value={lifecycle.from} />
    </EuiPanel>
  );
}

interface ModalOptions {
  closeModal: () => void;
  updateLifecycle: (lifecycle: IngestStreamLifecycle) => void;
  definition: ReadStreamDefinition;
}

function EditLifecycleModal({
  action,
  ...options
}: { action: LifecycleEditAction } & ModalOptions) {
  if (action === LifecycleEditAction.None) {
    return null;
  }

  if (action === LifecycleEditAction.Dsl) {
    return <DslModal {...options} />;
  }

  if (action === LifecycleEditAction.Ilm) {
    return <IlmModal {...options} />;
  }

  return <InheritModal {...options} />;
}

function DslModal({ closeModal, updateLifecycle }: ModalOptions) {
  const timeUnits = [
    { name: 'Days', value: 'd' },
    { name: 'Hours', value: 'h' },
    { name: 'Minutes', value: 'm' },
    { name: 'Seconds', value: 's' },
  ];

  const [selectedUnit, setSelectedUnit] = useState(timeUnits[0]);
  const [retentionValue, setRetentionValue] = useState(1);
  const [noRetention, setNoRetention] = useState(false);
  const [showUnitMenu, setShowUnitMenu] = useState(false);

  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Edit data retention for stream</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        Specify a custom data retention period for this stream.
        <EuiSpacer />
        <EuiFieldNumber
          value={retentionValue}
          onChange={(e) => setRetentionValue(Number(e.target.value))}
          disabled={noRetention}
          fullWidth
          append={
            <EuiPopover
              isOpen={showUnitMenu}
              closePopover={() => setShowUnitMenu(false)}
              button={
                <EuiButton
                  disabled={noRetention}
                  iconType="arrowDown"
                  iconSide="right"
                  color="text"
                  onClick={() => setShowUnitMenu(true)}
                >
                  {selectedUnit.name}
                </EuiButton>
              }
            >
              <EuiFlexGroup>
                <EuiContextMenuPanel
                  size="s"
                  items={timeUnits.map((unit) => (
                    <EuiFlexItem grow>
                      <EuiContextMenuItem
                        key={unit.value}
                        icon={selectedUnit.value === unit.value ? 'check' : ''}
                        onClick={() => {
                          setShowUnitMenu(false);
                          setSelectedUnit(unit);
                        }}
                      >
                        {unit.name}
                      </EuiContextMenuItem>
                    </EuiFlexItem>
                  ))}
                />
              </EuiFlexGroup>
            </EuiPopover>
          }
        />
        <EuiSpacer />
        <EuiSwitch
          label="Keep data indefinitely"
          checked={noRetention}
          onChange={() => setNoRetention(!noRetention)}
        />
        <EuiSpacer />
        <RetentionChanges />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty color="primary" onClick={() => closeModal()}>
          Cancel
        </EuiButtonEmpty>
        <EuiButton
          onClick={() => {
            updateLifecycle({
              dsl: {
                data_retention: noRetention ? undefined : `${retentionValue}${selectedUnit.value}`,
              },
            });
            closeModal();
          }}
          fill
        >
          Save
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

function IlmModal({
  closeModal,
  updateLifecycle,
  definition: {
    stream: {
      ingest: { lifecycle: existingLifecycle },
    },
  },
}: ModalOptions) {
  const [selectedPolicy, setSelectedPolicy] = useState(
    isIlmLifecycle(existingLifecycle) ? existingLifecycle.ilm.policy : 'my-policy'
  );

  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Attach a lifecycle policy to this stream</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        Select a pre-defined policy or visit Index Lifecycle Policies to create a new one.
        <EuiSpacer />
        <div>get the policies list here</div>
        <RetentionChanges />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty color="primary" onClick={() => closeModal()}>
          Cancel
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={() => {
            updateLifecycle({ ilm: { policy: selectedPolicy } });
            closeModal();
          }}
        >
          Attach policy
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

function InheritModal({ closeModal, updateLifecycle }: ModalOptions) {
  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Set data retention to default</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        All custom retention settings for this stream will be removed, resetting it to inherit data
        retention from its nearest parent.
        <EuiSpacer />
        <RetentionChanges />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty color="primary" onClick={() => closeModal()}>
          Cancel
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={() => {
            updateLifecycle({ inherit: {} });
            closeModal();
          }}
        >
          Set to default
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

function RetentionChanges() {
  return (
    <EuiCallOut title="Retention changes for dependent streams" iconType="logstashFilter">
      <p>
        Data retention changes will apply to dependant streams unless they already have custom
        retention settings in place.
      </p>
    </EuiCallOut>
  );
}
