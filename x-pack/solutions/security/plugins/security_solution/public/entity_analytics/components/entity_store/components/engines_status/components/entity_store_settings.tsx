/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { GetEntityStoreStatusResponse } from '@kbn/entity-store/common';
import type { EntityType } from '../../../../../../../common/entity_analytics/types';
import { EntityStoreErrorCallout } from '../../entity_store_error_callout';
import { getEngineProblems, getOverallHealth, isEngineLoading, toTableComponent } from '../helpers';
import { EngineComponentsStatusTable } from './engine_components_status';
import { EngineStatusHeader } from './engine_status_header';
import { EngineStatusHeaderAction } from './engine_status_header_action';
import { EnginesTable } from './engines_table';
import { EntityStoreConfiguration } from './entity_store_configuration';
import { EntityStoreOverview } from './entity_store_overview';
import { ProblemsCallout } from './problems_callout';
import { RunHistoryLink } from './run_history_link';

type Engine = GetEntityStoreStatusResponse['engines'][number];

const ComponentsAccordion = ({ type, engine }: { type: EntityType; engine?: Engine }) => {
  const problemCount = engine ? getEngineProblems(engine).length : 0;

  return (
    <EuiAccordion
      id={`entity-store-components-${type}`}
      // Problems are why people open this page, so the accordion that has some starts open.
      initialIsOpen={problemCount > 0}
      paddingSize="m"
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EngineStatusHeader entityType={type} />
          </EuiFlexItem>
          {engine && (
            <EuiFlexItem grow={false}>
              <EuiHealth color={problemCount > 0 ? 'danger' : 'success'}>
                {problemCount > 0
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.entityStore.components.problemCount',
                      {
                        defaultMessage: '{count, plural, one {# problem} other {# problems}}',
                        values: { count: problemCount },
                      }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.entityStore.components.allHealthy',
                      { defaultMessage: 'Healthy' }
                    )}
              </EuiHealth>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      extraAction={<EngineStatusHeaderAction engine={engine} />}
    >
      <EntityStoreErrorCallout engine={engine} size="s" />
      {engine && !isEngineLoading(engine.status) && engine.components && (
        <EngineComponentsStatusTable
          components={engine.components.map(toTableComponent)}
          readable
        />
      )}
    </EuiAccordion>
  );
};

/**
 * The Entity Store v2 settings page, ordered by how much people need each part: health first,
 * then what is wrong, how engines run, and the technical resources last.
 */
export const EntityStoreSettings = ({
  data,
  entityTypes,
}: {
  data: GetEntityStoreStatusResponse;
  entityTypes: EntityType[];
}) => {
  // Engines of types that are not enabled have no section, so they don't count either.
  const engines = useMemo(
    () => data.engines.filter(({ type }) => entityTypes.includes(type)),
    [data.engines, entityTypes]
  );
  const { health, problems } = useMemo(() => getOverallHealth(engines), [engines]);

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EntityStoreOverview
          health={health}
          problemCount={problems.length}
          engineCount={engines.length}
          entityTypes={entityTypes}
        />
      </EuiFlexItem>
      {problems.length > 0 && (
        <EuiFlexItem>
          <ProblemsCallout problems={problems} />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EnginesTable entityTypes={entityTypes} engines={engines} />
      </EuiFlexItem>
      <EuiFlexItem>
        <RunHistoryLink />
      </EuiFlexItem>
      <EuiFlexItem>
        <EntityStoreConfiguration data={data} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStore.components.title"
              defaultMessage="Components"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {entityTypes.map((type) => (
          <React.Fragment key={type}>
            <ComponentsAccordion
              type={type}
              engine={engines.find((engine) => engine.type === type)}
            />
            <EuiSpacer size="m" />
          </React.Fragment>
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
