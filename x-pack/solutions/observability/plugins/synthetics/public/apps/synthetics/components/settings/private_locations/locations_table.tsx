/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import type { Criteria } from '@elastic/eui/src/components/basic_table/basic_table';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CopyName } from './copy_name';
import { ViewLocationMonitors } from './view_location_monitors';
import { TableTitle } from '../../common/components/table_title';
import { TAGS_LABEL } from '../components/tags_field';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { PrivateLocationDocsLink, START_ADDING_LOCATIONS_DESCRIPTION } from './empty_locations';
import type { PrivateLocation } from '../../../../../../common/runtime_types';
import { NoPermissionsTooltip } from '../../common/components/permissions';
import { useLocationMonitors } from './hooks/use_location_monitors';
import { PolicyName } from './policy_name';
import { LOCATION_NAME_LABEL } from './location_form';
import { setIsPrivateLocationFlyoutVisible } from '../../../state/private_locations/actions';
import type { ClientPluginsStart } from '../../../../../plugin';
import { UnhealthyCountBadge } from './unhealthy_count_badge';
import { ResetMonitorModal } from '../../monitors_page/management/monitor_list_table/reset_monitor_modal';
import { useMonitorIntegrationHealth } from '../../common/hooks/use_monitor_integration_health';
import { isFixableByResetStatus } from '../../common/hooks/status_labels';
import { DeleteLocationModal } from './delete_location_modal';

interface ListItem extends PrivateLocation {
  monitors: number;
}

export const PrivateLocationsTable = ({
  deleteLoading,
  onDelete,
  onEdit,
  privateLocations,
}: {
  deleteLoading?: boolean;
  onDelete: (id: string) => void;
  onEdit: (privateLocation: PrivateLocation) => void;
  privateLocations: PrivateLocation[];
}) => {
  const dispatch = useDispatch();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [monitorPendingReset, setMonitorPendingReset] = useState<{
    resetIds: string[];
    skippedMonitors: Array<{ id: string; name: string }>;
  } | null>(null);
  const { resetMonitors, getUnhealthyLocationStatuses, getUnhealthyMonitorsForLocation } =
    useMonitorIntegrationHealth();

  const [locationPendingDelete, setLocationPendingDelete] = useState<string | null>(null);

  const { locationMonitors, loading } = useLocationMonitors();

  const { canSave, canManagePrivateLocations } = useSyntheticsSettingsContext();

  const { services } = useKibana<ClientPluginsStart>();

  const LazySpaceList = services.spaces?.ui.components.getSpaceList ?? (() => null);

  const tagsList = privateLocations.reduce((acc, item) => {
    const tags = item.tags || [];
    return new Set([...acc, ...tags]);
  }, new Set<string>());

  const columns: Array<EuiBasicTableColumn<ListItem>> = [
    {
      field: 'label',
      name: LOCATION_NAME_LABEL,
      render: (label: string) => <CopyName text={label} />,
    },
    {
      field: 'monitors',
      name: MONITORS,
      render: (monitors: number, item: ListItem) => {
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <ViewLocationMonitors count={monitors} locationName={item.label} />
            </EuiFlexItem>
            <UnhealthyCountBadge item={item} />
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'agentPolicyId',
      name: AGENT_POLICY_LABEL,
      render: (agentPolicyId: string) => <PolicyName agentPolicyId={agentPolicyId} />,
    },
    {
      name: TAGS_LABEL,
      field: 'tags',
      sortable: true,
      render: (val: string[]) => {
        const tags = val ?? [];
        if (tags.length === 0) {
          return '--';
        }
        return (
          <EuiFlexGroup gutterSize="xs" wrap>
            {tags.map((tag) => (
              <EuiFlexItem grow={false} key={tag}>
                <EuiBadge>{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        );
      },
    },
    {
      name: 'Spaces',
      field: 'spaces',
      sortable: true,
      render: (spaces: string[]) => {
        return <LazySpaceList namespaces={spaces} behaviorContext="outside-space" />;
      },
    },
    {
      name: ACTIONS_LABEL,
      actions: [
        {
          name: EDIT_LOCATION,
          description: EDIT_LOCATION,
          isPrimary: true,
          'data-test-subj': 'action-edit',
          onClick: onEdit,
          icon: 'pencil',
          type: 'icon',
        },
        {
          name: RESET_MONITORS_LABEL,
          description: RESET_MONITORS_LABEL,
          icon: 'refresh',
          type: 'icon' as const,
          color: 'warning',
          isPrimary: false,
          'data-test-subj': 'action-reset',
          available: (item: ListItem) => {
            const unhealthyMonitors = getUnhealthyMonitorsForLocation(item.id);
            return unhealthyMonitors.some((monitor) => {
              const locationStatuses = getUnhealthyLocationStatuses(monitor.configId);
              const locationStatus = locationStatuses.find((s) => s.locationId === item.id);
              return locationStatus != null && isFixableByResetStatus(locationStatus.status);
            });
          },
          onClick: (item: ListItem) => {
            const unhealthyMonitors = getUnhealthyMonitorsForLocation(item.id);

            const resetIds: string[] = [];
            const skippedMonitors: Array<{ id: string; name: string }> = [];

            for (const monitor of unhealthyMonitors) {
              const locationStatuses = getUnhealthyLocationStatuses(monitor.configId);
              const locationStatus = locationStatuses.find((s) => s.locationId === item.id);
              if (locationStatus && isFixableByResetStatus(locationStatus.status)) {
                resetIds.push(monitor.configId);
              } else {
                skippedMonitors.push({
                  id: monitor.configId,
                  name: monitor.name,
                });
              }
            }

            if (resetIds.length > 0) {
              setMonitorPendingReset({ resetIds, skippedMonitors });
            }
          },
        },
        {
          name: DELETE_LOCATION,
          description: (item: ListItem) => getDeleteDescription(item.monitors === 0, item.monitors),
          icon: 'trash',
          type: 'icon' as const,
          color: 'danger',
          enabled: (item: ListItem) => {
            const canDelete = item.monitors === 0;
            return canDelete && canSave;
          },
          onClick: (item: ListItem) => {
            setLocationPendingDelete(item.id);
          },
          isPrimary: true,
          'data-test-subj': 'action-delete',
        },
      ],
    },
  ];

  const items = privateLocations.map((location) => ({
    ...location,
    monitors: locationMonitors?.find((l) => l.id === location.id)?.count ?? 0,
  }));

  const openFlyout = () => dispatch(setIsPrivateLocationFlyoutVisible(true));

  const renderToolRight = () => {
    return [
      <NoPermissionsTooltip
        canEditSynthetics={canSave}
        canManagePrivateLocations={canManagePrivateLocations}
        key="addPrivateLocationButton"
      >
        <EuiButton
          fill
          data-test-subj={'addPrivateLocationButton'}
          isLoading={loading}
          disabled={!canSave || !canManagePrivateLocations}
          onClick={openFlyout}
          iconType="plusInCircle"
        >
          {ADD_LABEL}
        </EuiButton>
      </NoPermissionsTooltip>,
    ];
  };

  return (
    <div>
      <EuiText>
        {START_ADDING_LOCATIONS_DESCRIPTION} <PrivateLocationDocsLink label={LEARN_MORE} />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiInMemoryTable<ListItem>
        itemId={'id'}
        tableLayout="auto"
        tableCaption={PRIVATE_LOCATIONS}
        items={items}
        columns={columns}
        childrenBetween={
          <TableTitle
            total={items.length}
            label={PRIVATE_LOCATIONS}
            pageIndex={pageIndex}
            pageSize={pageSize}
          />
        }
        pagination={{
          pageSize,
          pageIndex,
        }}
        onTableChange={({ page }: Criteria<any>) => {
          setPageIndex(page?.index ?? 0);
          setPageSize(page?.size ?? 10);
        }}
        search={{
          toolsRight: renderToolRight(),
          box: {
            incremental: true,
          },
          filters: [
            {
              type: 'field_value_selection',
              field: 'tags',
              name: TAGS_LABEL,
              multiSelect: true,
              options: [...tagsList].map((tag) => ({
                value: tag,
                name: tag,
                view: tag,
              })),
            },
          ],
        }}
      />
      {monitorPendingReset && (
        <ResetMonitorModal
          configIds={monitorPendingReset.resetIds}
          onClose={() => setMonitorPendingReset(null)}
          resetMonitors={resetMonitors}
          skippedMonitors={monitorPendingReset.skippedMonitors}
        />
      )}
      {locationPendingDelete && (
        <DeleteLocationModal
          label={items.find((item) => item.id === locationPendingDelete)?.label ?? ''}
          locationId={locationPendingDelete}
          onDelete={(id) => {
            onDelete(id);
          }}
          onCancel={() => setLocationPendingDelete(null)}
          loading={deleteLoading ?? false}
        />
      )}
    </div>
  );
};

const PRIVATE_LOCATIONS = i18n.translate('xpack.synthetics.monitorManagement.privateLocations', {
  defaultMessage: 'Private locations',
});

const ACTIONS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.actions', {
  defaultMessage: 'Actions',
});

export const MONITORS = i18n.translate('xpack.synthetics.monitorManagement.monitors', {
  defaultMessage: 'Monitors',
});

export const AGENT_POLICY_LABEL = i18n.translate('xpack.synthetics.monitorManagement.agentPolicy', {
  defaultMessage: 'Agent Policy',
});

const DELETE_LOCATION = i18n.translate(
  'xpack.synthetics.settingsRoute.privateLocations.deleteLabel',
  {
    defaultMessage: 'Delete private location',
  }
);

const getDeleteDescription = (canDelete: boolean, monCount: number) =>
  canDelete
    ? DELETE_LOCATION
    : i18n.translate('xpack.synthetics.monitorManagement.cannotDelete.description', {
        defaultMessage: `You can't delete this location because it is used in {monCount, number} {monCount, plural,one {monitor} other {monitors}}. Remove all monitors from this location first.`,
        values: { monCount },
      });

const EDIT_LOCATION = i18n.translate('xpack.synthetics.settingsRoute.privateLocations.editLabel', {
  defaultMessage: 'Edit private location',
});

const ADD_LABEL = i18n.translate('xpack.synthetics.monitorManagement.createLocation', {
  defaultMessage: 'Create location',
});

export const LEARN_MORE = i18n.translate('xpack.synthetics.privateLocations.learnMore.label', {
  defaultMessage: 'Learn more.',
});

const RESET_MONITORS_LABEL = i18n.translate(
  'xpack.synthetics.settingsRoute.privateLocations.resetMonitors',
  {
    defaultMessage: 'Reset monitors',
  }
);
