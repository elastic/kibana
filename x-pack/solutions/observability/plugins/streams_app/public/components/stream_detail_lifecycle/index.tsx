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
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiSelectable,
  EuiSelectableOption,
  EuiHighlight,
  EuiBadge,
  EuiLink,
} from '@elastic/eui';
import { css } from '@emotion/css';
import React, { ReactNode, useEffect, useState } from 'react';
import {
  IngestStreamLifecycle,
  IngestUpsertRequest,
  ReadStreamDefinition,
  UnwiredReadStreamDefinition,
  WiredReadStreamDefinition,
  isDisabledLifecycle,
  isDslLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
  isRoot,
  isWiredReadStream,
} from '@kbn/streams-schema';
import {
  ILM_LOCATOR_ID,
  IlmLocatorParams,
  Phases,
  PolicyFromES,
} from '@kbn/index-lifecycle-management-common-shared';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { i18n } from '@kbn/i18n';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

enum LifecycleEditAction {
  None,
  Dsl,
  Ilm,
  Inherit,
}

function useLifecycleState({
  definition,
  isServerless,
}: {
  definition?: ReadStreamDefinition;
  isServerless: boolean;
}) {
  const [updateInProgress, setUpdateInProgress] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(LifecycleEditAction.None);
  const [lifecycleActions, setLifecycleActions] = useState<
    Array<{ name: string; action: LifecycleEditAction }>
  >([]);

  useEffect(() => {
    if (!definition) return;

    const actions = [
      {
        name: i18n.translate('xpack.streams.streamDetailLifecycle.setRetentionDays', {
          defaultMessage: 'Set specific retention days',
        }),
        action: LifecycleEditAction.Dsl,
      },
    ];

    if (isWiredReadStream(definition) && !isServerless) {
      actions.push({
        name: i18n.translate('xpack.streams.streamDetailLifecycle.setLifecyclePolicy', {
          defaultMessage: 'Use a lifecycle policy',
        }),
        action: LifecycleEditAction.Ilm,
      });
    }

    if (!isRoot(definition.name)) {
      actions.push({
        name: i18n.translate('xpack.streams.streamDetailLifecycle.resetToDefault', {
          defaultMessage: 'Reset to default',
        }),
        action: LifecycleEditAction.Inherit,
      });
    }

    setLifecycleActions(actions);
  }, [definition]);

  return {
    lifecycleActions,
    openEditModal,
    setOpenEditModal,
    updateInProgress,
    setUpdateInProgress,
  };
}

export function StreamDetailLifecycle({
  definition,
  refreshDefinition,
}: {
  definition?: WiredReadStreamDefinition | UnwiredReadStreamDefinition;
  refreshDefinition: () => void;
}) {
  const {
    core: { http, notifications },
    dependencies: {
      start: {
        share,
        streams: { streamsRepositoryClient },
      },
    },
    isServerless,
  } = useKibana();

  const {
    lifecycleActions,
    openEditModal,
    setOpenEditModal,
    updateInProgress,
    setUpdateInProgress,
  } = useLifecycleState({ definition, isServerless });

  const { signal } = useAbortController();

  if (!definition) {
    return null;
  }

  const ilmLocator = share.url.locators.get<IlmLocatorParams>(ILM_LOCATOR_ID);

  const getIlmPolicies = async () => {
    const response = await http.get<PolicyFromES[]>('/api/index_lifecycle_management/policies', {
      signal,
    });
    return response;
  };

  const updateLifecycle = async (lifecycle: IngestStreamLifecycle) => {
    try {
      setUpdateInProgress(true);

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
      setOpenEditModal(LifecycleEditAction.None);

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamDetailLifecycle.updated', {
          defaultMessage: 'Stream lifecycle updated',
        }),
      });
    } catch (error) {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.streams.streamDetailLifecycle.failed', {
          defaultMessage: 'Failed to update lifecycle',
        }),
        toastMessage: 'body' in error ? error.body.message : error.message,
      });
    } finally {
      setUpdateInProgress(false);
    }
  };

  return (
    <>
      <EditLifecycleModal
        action={openEditModal}
        definition={definition}
        closeModal={() => setOpenEditModal(LifecycleEditAction.None)}
        updateLifecycle={updateLifecycle}
        getIlmPolicies={getIlmPolicies}
        updateInProgress={updateInProgress}
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
                  <RetentionSummary definition={definition} isServerless={isServerless} />
                </EuiFlexItem>

                {isWiredReadStream(definition) ? (
                  <EuiFlexItem grow={4}>
                    <RetentionMetadata
                      definition={definition}
                      lifecycleActions={lifecycleActions}
                      ilmLocator={ilmLocator}
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

function RetentionSummary({
  definition,
  isServerless,
}: {
  definition: ReadStreamDefinition;
  isServerless: boolean;
}) {
  const isWired = isWiredReadStream(definition);

  const summaryText = (() => {
    const lifecycle = definition.stream.ingest.lifecycle;
    if (isInheritLifecycle(lifecycle)) {
      return (
        <p>
          {i18n.translate('xpack.streams.streamDetailLifecycle.useInheritPolicyNote', {
            defaultMessage: 'This data stream is using an inherit policy.',
          })}
          <br />
          {i18n.translate('xpack.streams.streamDetailLifecycle.overridePolicyNote', {
            defaultMessage:
              'You can override it with a custom data retention or with an ILM policy.',
          })}
        </p>
      );
    } else if (isDslLifecycle(lifecycle)) {
      const usingDsl = i18n.translate('xpack.streams.streamDetailLifecycle.useDslNote', {
        defaultMessage: 'This data stream is using a custom data retention.',
      });
      return (
        <p>
          {usingDsl}
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
        {i18n.translate('xpack.streams.streamDetailLifecycle.disabledPolicyNote', {
          defaultMessage: 'The retention for this data stream is disabled.',
        })}

        <br />
        {i18n.translate('xpack.streams.streamDetailLifecycle.overrideDisabledPolicyNote', {
          defaultMessage: 'You can set a custom data retention or use an ILM policy.',
        })}
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
        <h5>
          {i18n.translate('xpack.streams.streamDetailLifecycle.retentionSummaryLabel', {
            defaultMessage: 'Retention summary',
          })}
        </h5>
        {summaryText}
      </EuiText>
    </EuiPanel>
  );
}

function RetentionMetadata({
  definition,
  ilmLocator,
  lifecycleActions,
  openEditModal,
}: {
  definition: WiredReadStreamDefinition;
  ilmLocator?: LocatorPublic<IlmLocatorParams>;
  lifecycleActions: Array<{ name: string; action: LifecycleEditAction }>;
  openEditModal: (action: LifecycleEditAction) => void;
}) {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const router = useStreamsAppRouter();

  const Row = ({
    metadata,
    value,
    button,
  }: {
    metadata: string;
    value: ReactNode;
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
        <EuiFlexItem grow={4}>{value}</EuiFlexItem>
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
            items: lifecycleActions.map(({ name, action }) => ({
              name,
              onClick: () => {
                setMenuOpen(false);
                openEditModal(action);
              },
            })),
          },
        ]}
      />
    </EuiPopover>
  );

  const ilmLink = isIlmLifecycle(lifecycle) ? (
    <EuiBadge color="hollow">
      <EuiLink
        target="_blank"
        data-test-subj="streamsAppLifecycleBadgeIlmPolicyNameLink"
        href={ilmLocator?.getRedirectUrl({
          page: 'policy_edit',
          policyName: lifecycle.ilm.policy,
        })}
      >
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.ilmBadgeLabel', {
          defaultMessage: 'ILM Policy: {name}',
          values: { name: lifecycle.ilm.policy },
        })}
      </EuiLink>
    </EuiBadge>
  ) : null;

  const lifecycleOrigin = isInheritLifecycle(definition.stream.ingest.lifecycle) ? (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false}>Inherited from</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink
          target="_blank"
          href={router.link('/{key}/{tab}/{subtab}', {
            path: { key: lifecycle.from, tab: 'management', subtab: 'lifecycle' },
          })}
        >
          [{lifecycle.from}]
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    `Local override`
  );

  return (
    <EuiPanel hasBorder={false} hasShadow={false}>
      <Row
        metadata={i18n.translate('xpack.streams.streamDetailLifecycle.retentionPeriodLabel', {
          defaultMessage: 'Retention period',
        })}
        value={
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiBadge color={isDisabledLifecycle(lifecycle) ? 'default' : '#BD1F70'}>
                {isDslLifecycle(lifecycle)
                  ? lifecycle.dsl.data_retention ?? '∞'
                  : isIlmLifecycle(lifecycle)
                  ? 'Policy-based'
                  : 'Disabled'}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        button={contextualMenu}
      />
      <EuiHorizontalRule margin="m" />
      <Row
        metadata={i18n.translate('xpack.streams.streamDetailLifecycle.retentionSourceLabel', {
          defaultMessage: 'Source',
        })}
        value={
          <EuiFlexGroup alignItems="center" gutterSize="s">
            {ilmLink ? <EuiFlexItem grow={false}>{ilmLink}</EuiFlexItem> : null}
            <EuiFlexItem grow={false}>{lifecycleOrigin}</EuiFlexItem>
          </EuiFlexGroup>
        }
      />
    </EuiPanel>
  );
}

interface ModalOptions {
  closeModal: () => void;
  updateLifecycle: (lifecycle: IngestStreamLifecycle) => void;
  getIlmPolicies: () => Promise<PolicyFromES[]>;
  definition: ReadStreamDefinition;
  updateInProgress: boolean;
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

function DslModal({ closeModal, updateInProgress, updateLifecycle }: ModalOptions) {
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
          min={1}
          disabled={noRetention}
          fullWidth
          append={
            <EuiPopover
              isOpen={showUnitMenu}
              panelPaddingSize="none"
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
              <EuiContextMenuPanel
                size="s"
                items={timeUnits.map((unit) => (
                  <EuiFlexItem grow>
                    <EuiContextMenuItem
                      key={unit.value}
                      icon={selectedUnit.value === unit.value ? 'check' : 'empty'}
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
            </EuiPopover>
          }
        />
        <EuiSpacer />
        <EuiSwitch
          label={i18n.translate('xpack.streams.streamDetailLifecycle.keepDataIndefinitely', {
            defaultMessage: 'Keep data indefinitely',
          })}
          checked={noRetention}
          onChange={() => setNoRetention(!noRetention)}
        />
        <EuiSpacer />
      </EuiModalBody>

      <ModalFooter
        confirmationLabel="Save"
        closeModal={closeModal}
        onConfirm={() => {
          updateLifecycle({
            dsl: {
              data_retention: noRetention ? undefined : `${retentionValue}${selectedUnit.value}`,
            },
          });
        }}
        updateInProgress={updateInProgress}
      />
    </EuiModal>
  );
}

interface IlmOptionData {
  phases?: string;
}

function IlmModal({
  closeModal,
  updateLifecycle,
  updateInProgress,
  getIlmPolicies,
  definition: {
    stream: {
      ingest: { lifecycle: existingLifecycle },
    },
  },
}: ModalOptions) {
  const [policies, setPolicies] = useState<Array<EuiSelectableOption<IlmOptionData>>>([]);
  const [selectedPolicy, setSelectedPolicy] = useState(
    isIlmLifecycle(existingLifecycle) ? existingLifecycle.ilm.policy : undefined
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const phasesDescription = (phases: Phases) => {
      const desc: string[] = [];
      if (phases.hot) {
        const rollover = phases.hot.actions.rollover;
        const rolloverWhen = [
          rollover?.max_age && 'max age ' + rollover.max_age,
          rollover?.max_docs && 'max docs ' + rollover.max_docs,
          rollover?.max_primary_shard_docs &&
            'primary shard docs ' + rollover.max_primary_shard_docs,
          rollover?.max_primary_shard_size &&
            'primary shard size ' + rollover.max_primary_shard_size,
          rollover?.max_size && 'index size ' + rollover.max_size,
        ]
          .filter(Boolean)
          .join(' or ');
        desc.push(`Hot (${rolloverWhen ? 'rollover when ' + rolloverWhen : 'no rollover'})`);
      }
      if (phases.warm) {
        desc.push(`Warm after ${phases.warm.min_age}`);
      }
      if (phases.cold) {
        desc.push(`Cold after ${phases.cold.min_age}`);
      }
      if (phases.frozen) {
        desc.push(`Frozen after ${phases.frozen.min_age}`);
      }
      if (phases.delete) {
        desc.push(`Delete after ${phases.delete.min_age}`);
      } else {
        desc.push('Keep data indefinitely');
      }

      return desc.join(', ');
    };

    setIsLoading(true);
    getIlmPolicies()
      .then((policies) => {
        const policyOptions = policies.map(
          ({ name, policy }): EuiSelectableOption<IlmOptionData> => ({
            label: `${name}`,
            searchableLabel: name,
            checked: selectedPolicy === name ? 'on' : undefined,
            data: {
              phases: phasesDescription(policy.phases),
            },
          })
        );

        setPolicies(policyOptions);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Attach a lifecycle policy to this stream</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        Select a pre-defined policy or visit Index Lifecycle Policies to create a new one.
        <EuiSpacer />
        <EuiPanel hasBorder hasShadow={false} paddingSize="s">
          <EuiSelectable
            searchable
            singleSelection
            isLoading={isLoading}
            options={policies}
            onChange={(options) => {
              setSelectedPolicy(options.find((option) => option.checked === 'on')?.label);
              setPolicies(options);
            }}
            listProps={{
              rowHeight: 50,
            }}
            renderOption={(option: EuiSelectableOption<IlmOptionData>, searchValue: string) => (
              <>
                <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
                <EuiText size="xs" color="subdued" className="eui-displayBlock">
                  <small>
                    <EuiHighlight search={searchValue}>{option.phases || ''}</EuiHighlight>
                  </small>
                </EuiText>
              </>
            )}
          >
            {(list, search) => (
              <>
                {search}
                {list}
              </>
            )}
          </EuiSelectable>
        </EuiPanel>
        <EuiSpacer />
      </EuiModalBody>

      <ModalFooter
        confirmationLabel="Attach policy"
        closeModal={closeModal}
        onConfirm={() => {
          if (selectedPolicy) {
            updateLifecycle({ ilm: { policy: selectedPolicy } });
          }
        }}
        confirmationIsDisabled={!selectedPolicy}
        updateInProgress={updateInProgress}
      />
    </EuiModal>
  );
}

function InheritModal({ closeModal, updateInProgress, updateLifecycle }: ModalOptions) {
  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.streams.streamDetailLifecycle.defaultLifecycleTitle', {
            defaultMessage: 'Set data retention to default',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {i18n.translate('xpack.streams.streamDetailLifecycle.defaultLifecycleDesc', {
          defaultMessage:
            'All custom retention settings for this stream will be removed, resetting it to inherit data retention from its nearest parent.',
        })}
        <EuiSpacer />
      </EuiModalBody>

      <ModalFooter
        confirmationLabel="Set to default"
        closeModal={closeModal}
        onConfirm={() => updateLifecycle({ inherit: {} })}
        updateInProgress={updateInProgress}
      />
    </EuiModal>
  );
}

function ModalFooter({
  updateInProgress,
  confirmationLabel,
  confirmationIsDisabled,
  onConfirm,
  closeModal,
}: {
  updateInProgress: boolean;
  confirmationLabel: string;
  confirmationIsDisabled?: boolean;
  onConfirm: () => void;
  closeModal: () => void;
}) {
  return (
    <EuiModalFooter>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiCallOut
            title={i18n.translate(
              'xpack.streams.streamDetailLifecycle.lifecycleDependentImpactTitle',
              {
                defaultMessage: 'Retention changes for dependent streams',
              }
            )}
            iconType="logstashFilter"
          >
            <p>
              {i18n.translate('xpack.streams.streamDetailLifecycle.lifecycleDependentImpactDesc', {
                defaultMessage:
                  'Data retention changes will apply to dependant streams unless they already have custom retention settings in place.',
              })}
            </p>
          </EuiCallOut>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                disabled={updateInProgress}
                color="primary"
                onClick={() => closeModal()}
              >
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                disabled={confirmationIsDisabled}
                isLoading={updateInProgress}
                onClick={() => onConfirm()}
              >
                {confirmationLabel}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiModalFooter>
  );
}
