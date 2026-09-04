/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { BoolQuery } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';
import { RISK_SCORE_INDEX_PATTERN } from '../../../../common/entity_analytics/risk_engine';
import { getAlertsIndex } from '../../../../common/entity_analytics/utils';
import { RiskScorePreviewTable } from './risk_score_preview_table';
import * as i18n from '../../translations';
import { useRiskScorePreview } from '../../api/hooks/use_preview_risk_scores';
import { EntityIconByType } from '../entity_store/helpers';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useEntityAnalyticsTypes } from '../../hooks/use_enabled_entity_types';
import { RiskScoreStatusPanel, useRiskScoreStatus } from '../risk_score_status_panel';
import type { AlertFilter } from './common';

interface IRiskScorePreviewPanel {
  showMessage: React.ReactNode;
  hideMessage: React.ReactNode;
  isLoading: boolean;
  items: EntityRiskScoreRecord[];
  type: EntityType;
}

const ENTITY_ID_FIELD = 'entity.id';

const getRiskiestScores = (scores: EntityRiskScoreRecord[] = [], field: string) =>
  scores
    ?.filter((item) => item?.id_field === field || item?.id_field === ENTITY_ID_FIELD)
    ?.sort((a, b) => b?.calculated_score_norm - a?.calculated_score_norm)
    ?.slice(0, 5) || [];

interface RiskScorePreviewSectionProps {
  hasReadPermissions: boolean;
  isPrivilegesLoading: boolean;
  includeClosedAlerts: boolean;
  from: string;
  to: string;
  alertFilters?: Array<AlertFilter>;
}

export const RiskScorePreviewSection: React.FC<RiskScorePreviewSectionProps> = ({
  hasReadPermissions,
  isPrivilegesLoading,
  includeClosedAlerts,
  from,
  to,
  alertFilters,
}) => {
  const sectionBody = useMemo(() => {
    if (isPrivilegesLoading) {
      return (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (hasReadPermissions) {
      return (
        <RiskEnginePreview
          includeClosedAlerts={includeClosedAlerts}
          from={from}
          to={to}
          alertFilters={alertFilters}
        />
      );
    }

    return <MissingPermissionsCallout />;
  }, [hasReadPermissions, isPrivilegesLoading, includeClosedAlerts, from, to, alertFilters]);

  return (
    <>
      <EuiTitle>
        <h2>{i18n.PREVIEW}</h2>
      </EuiTitle>
      <EuiSpacer size={'s'} />
      {sectionBody}
    </>
  );
};

const MissingPermissionsCallout = () => {
  return (
    <EuiCallOut
      title={i18n.PREVIEW_MISSING_PERMISSIONS_TITLE}
      color="primary"
      iconType="info"
      data-test-subj="missing-risk-engine-preview-permissions"
    >
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.riskScore.riskScorePreview.missingPermissionsCallout.description"
          defaultMessage="Read permission is required for the {index} index pattern in order to preview data. Contact your administrator for further assistance."
          values={{
            index: <EuiCode>{RISK_SCORE_INDEX_PATTERN}</EuiCode>,
          }}
        />
      </EuiText>
    </EuiCallOut>
  );
};

const RiskScorePreviewPanel = ({
  items,
  showMessage,
  hideMessage,
  isLoading,
  type,
}: IRiskScorePreviewPanel) => {
  const [trigger, setTrigger] = useState<'closed' | 'open'>('open');
  const onToggle = (isOpen: boolean) => {
    const newState = isOpen ? 'open' : 'closed';
    setTrigger(newState);
  };

  return (
    <EuiPanel hasBorder={true}>
      <EuiAccordion
        initialIsOpen={true}
        isLoading={isLoading}
        id={'host-table'}
        buttonContent={trigger === 'closed' ? showMessage : hideMessage}
        forceState={trigger}
        onToggle={onToggle}
        extraAction={<EuiIcon type={EntityIconByType[type]} aria-hidden={true} />}
      >
        <>
          <EuiSpacer size={'m'} />
          <RiskScorePreviewTable items={items} type={type} />
        </>
      </EuiAccordion>
    </EuiPanel>
  );
};

const RiskEnginePreview: React.FC<{
  includeClosedAlerts: boolean;
  from: string;
  to: string;
  alertFilters?: Array<AlertFilter>;
}> = ({ includeClosedAlerts, from, to, alertFilters }) => {
  const entityTypes = useEntityAnalyticsTypes();

  const [filters] = useState<{ bool: BoolQuery }>({
    bool: { must: [], filter: [], should: [], must_not: [] },
  });

  const spaceId = useSpaceId();

  const { data, isLoading, refetch, isError } = useRiskScorePreview({
    data_view_id: spaceId ? getAlertsIndex(spaceId) : undefined,
    filter: filters,
    range: {
      start: from,
      end: to,
    },
    exclude_alert_statuses: includeClosedAlerts ? [] : ['closed'],
    filters: alertFilters && alertFilters.length > 0 ? alertFilters : undefined,
  });

  // The preview returns one bucket per entity type. We treat the result as
  // empty only once the request has resolved and every bucket is empty, so we
  // don't flash the status callout during the initial fetch.
  const isPreviewEmpty =
    !isLoading &&
    !!data &&
    entityTypes.every(
      (entityType) =>
        getRiskiestScores(data.scores[entityType], EntityTypeToIdentifierField[entityType])
          .length === 0
    );

  const status = useRiskScoreStatus({
    isResultEmpty: isPreviewEmpty,
    facts: { scoringWindow: { start: from, end: to } },
  });

  if (isError) {
    return (
      <EuiCallOut
        announceOnMount
        data-test-subj="risk-preview-error"
        title={i18n.PREVIEW_ERROR_TITLE}
        color="danger"
        iconType="error"
      >
        <p>{i18n.PREVIEW_ERROR_MESSAGE}</p>
        <EuiButton
          data-test-subj="risk-preview-error-button"
          color="danger"
          onClick={() => refetch()}
        >
          {i18n.PREVIEW_ERROR_TRY_AGAIN}
        </EuiButton>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiText>{i18n.PREVIEW_DESCRIPTION}</EuiText>

      <EuiSpacer />
      <EuiSpacer />

      {/*
       * When the preview yields zero scores across every entity type, surface
       * a status callout explaining *why* before the (empty) accordions below.
       * The status hook returns `unknown` whenever there is real data, so this
       * block is naturally suppressed in the happy path.
       */}
      {!isLoading && status.reason !== 'unknown' && (
        <>
          <RiskScoreStatusPanel
            reason={status.reason}
            facts={status.facts}
            variant="callout"
            // We're already on the management page; the destination of the
            // default action is the page the user is viewing.
            primaryAction={null}
            data-test-subj="risk-score-preview-status"
          />
          <EuiSpacer />
        </>
      )}

      {entityTypes.map((entityType) => (
        <Fragment key={entityType}>
          <RiskScorePreviewPanel
            items={getRiskiestScores(
              data?.scores[entityType],
              EntityTypeToIdentifierField[entityType]
            )}
            showMessage={
              <FormattedMessage
                id="xpack.securitySolution.riskScore.riskScorePreview.show"
                defaultMessage="Show {entityType}s"
                values={{
                  entityType,
                }}
              />
            }
            hideMessage={
              <FormattedMessage
                id="xpack.securitySolution.riskScore.riskScorePreview.hide"
                defaultMessage="Hide {entityType}s"
                values={{
                  entityType,
                }}
              />
            }
            isLoading={isLoading}
            type={entityType}
          />
          <EuiSpacer />
        </Fragment>
      ))}
    </>
  );
};
