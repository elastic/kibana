/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiComboBox,
  EuiFormRow,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EntityFieldInfo } from '../../hooks/use_available_metrics';
import {
  findAvailableEntities,
  findEntityByAttribute,
  type EntityDefinition,
} from '../../types/entity_definitions';

interface EntitySelectorProps {
  /** Currently selected entity attribute (e.g., 'host.name') */
  value: string;
  /** Callback when entity changes */
  onChange: (field: string) => void;
  /** Available entity fields from the index */
  entityFields?: EntityFieldInfo[];
  /** Whether the selector is loading */
  isLoading?: boolean;
  /** Whether the selector is disabled */
  isDisabled?: boolean;
}

interface EntityOption {
  label: string;
  value: string;
  entity?: EntityDefinition;
  isCustom?: boolean;
}

const CATEGORY_ORDER = [
  'infrastructure',
  'kubernetes',
  'application',
  'aws',
  'cloud',
  'serverless',
  'database',
  'messaging',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  infrastructure: i18n.translate(
    'xpack.infra.esqlInventory.entitySelector.categoryInfrastructure',
    {
      defaultMessage: 'Infrastructure',
    }
  ),
  kubernetes: i18n.translate('xpack.infra.esqlInventory.entitySelector.categoryKubernetes', {
    defaultMessage: 'Kubernetes',
  }),
  application: i18n.translate('xpack.infra.esqlInventory.entitySelector.categoryApplication', {
    defaultMessage: 'Application',
  }),
  aws: i18n.translate('xpack.infra.esqlInventory.entitySelector.categoryAws', {
    defaultMessage: 'AWS',
  }),
  cloud: i18n.translate('xpack.infra.esqlInventory.entitySelector.categoryCloud', {
    defaultMessage: 'Cloud',
  }),
  serverless: i18n.translate('xpack.infra.esqlInventory.entitySelector.categoryServerless', {
    defaultMessage: 'Serverless',
  }),
  database: i18n.translate('xpack.infra.esqlInventory.entitySelector.categoryDatabase', {
    defaultMessage: 'Databases',
  }),
  messaging: i18n.translate('xpack.infra.esqlInventory.entitySelector.categoryMessaging', {
    defaultMessage: 'Messaging',
  }),
};

export const EntitySelector: React.FC<EntitySelectorProps> = ({
  value,
  onChange,
  entityFields = [],
  isLoading = false,
  isDisabled = false,
}) => {
  // Get available field names
  const availableFieldNames = useMemo(() => entityFields.map((f) => f.name), [entityFields]);

  // Find entities that match available fields
  const availableEntities = useMemo(
    () => findAvailableEntities(availableFieldNames),
    [availableFieldNames]
  );

  // Group entities by category (only show matched entities, no other fields)
  const groupedOptions = useMemo(() => {
    const groups: Array<EuiComboBoxOptionOption<string>> = [];

    for (const category of CATEGORY_ORDER) {
      const entitiesInCategory = availableEntities.filter((e) => e.category === category);
      if (entitiesInCategory.length > 0) {
        groups.push({
          label: CATEGORY_LABELS[category],
          isGroupLabelOption: true,
          options: entitiesInCategory.map((entity) => ({
            key: entity.identifyingAttribute,
            label: entity.displayName,
            value: entity.identifyingAttribute,
          })),
        });
      }
    }

    return groups;
  }, [availableEntities]);

  // Build the selected option
  const selectedOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    if (!value) return [];

    const entity = findEntityByAttribute(value);
    if (entity) {
      return [
        {
          key: entity.identifyingAttribute,
          label: entity.displayName,
          value: entity.identifyingAttribute,
        },
      ];
    }

    // Only show selection if it matches an entity (don't show arbitrary fields)
    return [];
  }, [value]);

  const handleChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    if (selected.length > 0 && selected[0].value) {
      onChange(selected[0].value);
    } else {
      onChange('');
    }
  };

  // Custom render for entity options
  const renderOption = (option: EuiComboBoxOptionOption<string>) => {
    const entity = findEntityByAttribute(option.value ?? '');

    if (!entity) {
      return <span>{option.label}</span>;
    }

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={entity.iconType} size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <span>{entity.displayName}</span>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{entity.identifyingAttribute}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.infra.esqlInventory.entitySelector.label', {
        defaultMessage: 'Entity',
      })}
      css={css`
        min-width: 300px;
      `}
    >
      <EuiComboBox<string>
        singleSelection={{ asPlainText: true }}
        options={groupedOptions}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        isLoading={isLoading}
        isDisabled={isDisabled}
        renderOption={renderOption}
        placeholder={i18n.translate('xpack.infra.esqlInventory.entitySelector.placeholder', {
          defaultMessage: 'Select an entity type',
        })}
        data-test-subj="esqlInventoryEntitySelector"
        compressed
        isClearable
      />
    </EuiFormRow>
  );
};
