/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { capitalize } from 'lodash/fp';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { GetEntityStoreStatusResponse } from '@kbn/entity-store/common';
import type { EntityType } from '../../../../../../../common/entity_analytics/types';
import { getEntityIcon } from '../../../../threat_hunting/top_threat_hunting_leads/utils';
import { ENTITY_STORE_ENGINES_TABLE_TEST_ID } from '../../../../../test_ids';
import { NO_VALUE, formatCount, formatDuration, formatFrequency } from '../format';
import { getEngineProblems } from '../helpers';
import { EngineStatusBadge } from './engine_status_badge';

type Engine = GetEntityStoreStatusResponse['engines'][number];

interface EngineRow {
  type: EntityType;
  engine?: Engine;
  /** The first problem of the engine, if it has any. */
  problem?: string;
}

const header = (name: string, description: string) => ({ name, description });

const columns: Array<EuiBasicTableColumn<EngineRow>> = [
  {
    ...header(
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.type', {
        defaultMessage: 'Entity type',
      }),
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.typeHelp', {
        defaultMessage: 'The kind of entity this engine extracts from logs.',
      })
    ),
    render: ({ type }: EngineRow) => (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={getEntityIcon(type)} aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{capitalize(type)}</EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    ...header(
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.status', {
        defaultMessage: 'Status',
      }),
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.statusHelp', {
        defaultMessage: 'Whether the engine is extracting entities.',
      })
    ),
    render: ({ engine }: EngineRow) => <EngineStatusBadge status={engine?.status} />,
  },
  {
    ...header(
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.frequency', {
        defaultMessage: 'Runs',
      }),
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.frequencyHelp', {
        defaultMessage: 'How often logs are extracted.',
      })
    ),
    width: '11em',
    render: ({ engine }: EngineRow) => formatFrequency(engine?.frequency),
  },
  {
    ...header(
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.lookback', {
        defaultMessage: 'Lookback',
      }),
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.lookbackHelp', {
        defaultMessage: 'The oldest logs a run reads.',
      })
    ),
    render: ({ engine }: EngineRow) => formatDuration(engine?.lookbackPeriod),
  },
  {
    ...header(
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.delay', {
        defaultMessage: 'Delay',
      }),
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.delayHelp', {
        defaultMessage: 'The gap kept between now and the logs read, so late logs can arrive.',
      })
    ),
    render: ({ engine }: EngineRow) => formatDuration(engine?.delay),
  },
  {
    ...header(
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.timeout', {
        defaultMessage: 'Timeout',
      }),
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.timeoutHelp', {
        defaultMessage: 'A run is stopped when it takes longer than this.',
      })
    ),
    render: ({ engine }: EngineRow) => formatDuration(engine?.timeout),
  },
  {
    ...header(
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.maxLogsPerPage', {
        defaultMessage: 'Logs per page',
      }),
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityStore.engines.maxLogsPerPageHelp',
        { defaultMessage: 'The most logs read in one page of a run.' }
      )
    ),
    align: 'right',
    render: ({ engine }: EngineRow) => formatCount(engine?.maxLogsPerPage),
  },
  {
    ...header(
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.history', {
        defaultMessage: 'Field history',
      }),
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.historyHelp', {
        defaultMessage: 'How many past values are kept for fields that keep history.',
      })
    ),
    align: 'right',
    render: ({ engine }: EngineRow) =>
      engine
        ? i18n.translate(
            'xpack.securitySolution.entityAnalytics.entityStore.engines.historyValue',
            {
              defaultMessage: '{count, plural, one {# value} other {# values}}',
              values: { count: engine.fieldHistoryLength },
            }
          )
        : NO_VALUE,
  },
  {
    ...header(
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.problem', {
        defaultMessage: 'Problem',
      }),
      i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.engines.problemHelp', {
        defaultMessage: 'The first thing wrong with this engine, if anything.',
      })
    ),
    width: '24%',
    render: ({ problem }: EngineRow) =>
      problem ? (
        <EuiToolTip content={problem}>
          <EuiText size="s" color="danger" tabIndex={0}>
            <span className="eui-textTruncate">{problem}</span>
          </EuiText>
        </EuiToolTip>
      ) : (
        NO_VALUE
      ),
  },
];

/** One row per entity type: its status and how it runs, in readable units. */
export const EnginesTable = ({
  entityTypes,
  engines,
}: {
  entityTypes: EntityType[];
  engines: Engine[];
}) => {
  const items = useMemo<EngineRow[]>(
    () =>
      entityTypes.map((type) => {
        const engine = engines.find((candidate) => candidate.type === type);
        const [first] = engine ? getEngineProblems(engine) : [];
        return {
          type,
          engine,
          problem: first ? `${first.source}: ${first.message}` : undefined,
        };
      }),
    [entityTypes, engines]
  );

  return (
    <div data-test-subj={ENTITY_STORE_ENGINES_TABLE_TEST_ID}>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStore.engines.title"
            defaultMessage="Engines"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption={i18n.translate(
          'xpack.securitySolution.entityAnalytics.entityStore.engines.caption',
          { defaultMessage: 'Status and log extraction settings of each entity type' }
        )}
        items={items}
        columns={columns}
      />
    </div>
  );
};
