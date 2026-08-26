/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiInMemoryTable,
  EuiPageTemplate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core/public';
import type { EntityDefinition } from '../../common/entity_definition';
import { useDefinitions, useDeleteDefinition } from '../hooks/use_definitions';
import { DefinitionFlyout } from './definition_flyout';

interface Props {
  http: HttpStart;
}

export const DefinitionsTab = ({ http }: Props) => {
  const { data: definitions = [], isLoading } = useDefinitions(http);
  const deleteMutation = useDeleteDefinition(http);
  const [showFlyout, setShowFlyout] = useState(false);

  const columns = [
    {
      field: 'name' as const,
      name: i18n.translate('xpack.entitiesRuntimeCaue.definitions.colName', {
        defaultMessage: 'Name',
      }),
    },
    {
      field: 'type' as const,
      name: i18n.translate('xpack.entitiesRuntimeCaue.definitions.colType', {
        defaultMessage: 'Type',
      }),
      render: (type: string) => <EuiBadge>{type}</EuiBadge>,
    },
    {
      field: 'identityFields' as const,
      name: i18n.translate('xpack.entitiesRuntimeCaue.definitions.colFields', {
        defaultMessage: 'Identity fields',
      }),
      render: (fields: string[]) => fields.join(', '),
    },
    {
      field: 'indexPattern' as const,
      name: i18n.translate('xpack.entitiesRuntimeCaue.definitions.colPattern', {
        defaultMessage: 'Index pattern',
      }),
    },
    {
      field: 'lookbackPeriod' as const,
      name: i18n.translate('xpack.entitiesRuntimeCaue.definitions.colLookback', {
        defaultMessage: 'Lookback',
      }),
    },
    {
      name: i18n.translate('xpack.entitiesRuntimeCaue.definitions.colActions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: i18n.translate('xpack.entitiesRuntimeCaue.definitions.deleteAction', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate(
            'xpack.entitiesRuntimeCaue.definitions.deleteActionDescription',
            { defaultMessage: 'Delete this definition and its metadata index' }
          ),
          type: 'icon' as const,
          icon: 'trash' as const,
          color: 'danger' as const,
          onClick: (item: EntityDefinition) => deleteMutation.mutate(item.id),
        },
      ],
    },
  ];

  return (
    <EuiPageTemplate.Section>
      <EuiFlexGroup justifyContent="flexEnd" style={{ marginBottom: 16 }}>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="plus"
            onClick={() => setShowFlyout(true)}
            data-test-subj="entitiesRuntimeCreateDefinition"
          >
            {i18n.translate('xpack.entitiesRuntimeCaue.definitions.createButton', {
              defaultMessage: 'Create definition',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiInMemoryTable
        items={definitions}
        columns={columns}
        loading={isLoading}
        tableCaption={i18n.translate('xpack.entitiesRuntimeCaue.definitions.tableCaption', {
          defaultMessage: 'Entity definitions',
        })}
        pagination
      />

      {showFlyout && <DefinitionFlyout http={http} onClose={() => setShowFlyout(false)} />}
    </EuiPageTemplate.Section>
  );
};
