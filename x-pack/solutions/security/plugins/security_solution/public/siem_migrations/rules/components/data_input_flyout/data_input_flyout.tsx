/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFlyoutResizable,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  SiemMigrationRetryFilter,
  SiemMigrationTaskStatus,
} from '../../../../../common/siem_migrations/constants';
import {
  type RuleMigrationResourceBase,
  type RuleMigrationTaskStats,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { RulesDataInput } from './steps/rules/rules_data_input';
import { useStartMigration } from '../../service/hooks/use_start_migration';
import { DataInputStep } from './steps/constants';
import { MacrosDataInput } from './steps/macros/macros_data_input';
import { LookupsDataInput } from './steps/lookups/lookups_data_input';

interface MissingResourcesIndexed {
  macros: string[];
  lookups: string[];
}

export interface MigrationDataInputFlyoutProps {
  onClose: () => void;
  migrationStats?: RuleMigrationTaskStats;
}
export const MigrationDataInputFlyout = React.memo<MigrationDataInputFlyoutProps>(
  ({ onClose, migrationStats: initialMigrationSats }) => {
    const [migrationStats, setMigrationStats] = useState<RuleMigrationTaskStats | undefined>(
      initialMigrationSats
    );
    const [missingResourcesIndexed, setMissingResourcesIndexed] = useState<
      MissingResourcesIndexed | undefined
    >();
    const isRetry = migrationStats?.status === SiemMigrationTaskStatus.FINISHED;

    const { startMigration, isLoading: isStartLoading } = useStartMigration(onClose);
    const onStartMigration = useCallback(() => {
      if (migrationStats?.id) {
        const retryFilter = isRetry ? SiemMigrationRetryFilter.NOT_FULLY_TRANSLATED : undefined;
        startMigration(migrationStats.id, retryFilter);
      }
    }, [startMigration, migrationStats?.id, isRetry]);

    const [dataInputStep, setDataInputStep] = useState<DataInputStep>(DataInputStep.Rules);

    const onMigrationCreated = useCallback((createdMigrationStats: RuleMigrationTaskStats) => {
      setMigrationStats(createdMigrationStats);
    }, []);

    const onMissingResourcesFetched = useCallback(
      (missingResources: RuleMigrationResourceBase[]) => {
        const newMissingResourcesIndexed = missingResources.reduce<MissingResourcesIndexed>(
          (acc, { type, name }) => {
            if (type === 'macro') {
              acc.macros.push(name);
            } else if (type === 'lookup') {
              acc.lookups.push(name);
            }
            return acc;
          },
          { macros: [], lookups: [] }
        );
        setMissingResourcesIndexed(newMissingResourcesIndexed);
        if (newMissingResourcesIndexed.macros.length) {
          setDataInputStep(DataInputStep.Macros);
          return;
        }
        if (newMissingResourcesIndexed.lookups.length) {
          setDataInputStep(DataInputStep.Lookups);
          return;
        }
        setDataInputStep(DataInputStep.End);
      },
      []
    );

    const onAllLookupsCreated = useCallback(() => {
      setDataInputStep(DataInputStep.End);
    }, []);

    return (
      <EuiFlyoutResizable
        onClose={onClose}
        size={850}
        maxWidth={1200}
        minWidth={500}
        data-test-subj="uploadRulesFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.title"
                defaultMessage="Upload Splunk SIEM rules"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <RulesDataInput
                dataInputStep={dataInputStep}
                migrationStats={migrationStats}
                onMigrationCreated={onMigrationCreated}
                onMissingResourcesFetched={onMissingResourcesFetched}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <MacrosDataInput
                dataInputStep={dataInputStep}
                missingMacros={missingResourcesIndexed?.macros}
                migrationStats={migrationStats}
                onMissingResourcesFetched={onMissingResourcesFetched}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <LookupsDataInput
                dataInputStep={dataInputStep}
                missingLookups={missingResourcesIndexed?.lookups}
                migrationStats={migrationStats}
                onAllLookupsCreated={onAllLookupsCreated}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose}>
                <FormattedMessage
                  id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.closeButton"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={onStartMigration}
                disabled={!migrationStats?.id}
                isLoading={isStartLoading}
                data-test-subj="startMigrationButton"
              >
                {isRetry ? (
                  <FormattedMessage
                    id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.retryTranslateButton"
                    defaultMessage="Retry translation"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.translateButton"
                    defaultMessage="Translate"
                  />
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyoutResizable>
    );
  }
);
MigrationDataInputFlyout.displayName = 'MigrationDataInputFlyout';
