/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux-v7';

import { SecurityPageName } from '../../../common/constants';
import { useKibana, useNavigation } from '../../common/lib/kibana';
import { InputsModelId } from '../../common/store/inputs/constants';
import { inputsActions } from '../../common/store/inputs';

/**
 * Detonation alerts are indexed at the time the sample was detonated, which can be months back.
 * Pivots therefore always carry an absolute range around that timestamp, otherwise the Alerts
 * page would keep whatever range it had and appear empty.
 */
const PIVOT_WINDOW_MS = 24 * 60 * 60 * 1000;

const buildAbsoluteRange = (timestamp: string | null): { from: string; to: string } | null => {
  if (!timestamp) {
    return null;
  }

  const detonatedAt = new Date(timestamp).getTime();
  if (Number.isNaN(detonatedAt)) {
    return null;
  }

  return {
    from: new Date(detonatedAt - PIVOT_WINDOW_MS).toISOString(),
    to: new Date(detonatedAt + PIVOT_WINDOW_MS).toISOString(),
  };
};

const escapeKqlValue = (value: string): string => value.replace(/["\\]/g, '\\$&');

export interface DetonationAlertsPivot {
  /** Sample hash, matched against `file.hash.sha256`. Spans every detonation of that sample. */
  sampleHash?: string | null;
  /** Detonation VM agent, matched against `agent.id`. Identifies one detonation. */
  agentId?: string | null;
  /** A single alert, matched against `kibana.alert.uuid`. Narrows the pivot to that one alert. */
  alertId?: string | null;
  /** A MITRE technique, narrowing the scope below to the alerts that map to it. */
  techniqueId?: string | null;
  /** Detonation time, used to build the absolute range the pivot opens with. */
  timestamp?: string | null;
}

/**
 * Each identifier stands on its own, so the most specific one available wins rather than being
 * combined with the others.
 *
 * Every detonation runs on its own short-lived VM, so `agent.id` already means "this detonation
 * and no other", which is what makes it the right scope even when the sample has been detonated
 * several times. Adding the hash on top of it would narrow further than intended: most alerts a
 * detonation produces are behavioural and carry no `file.hash.sha256` at all, so requiring both
 * hides the majority of them and, for detonations that only fired behaviour rules, all of them.
 */
const buildScope = ({ sampleHash, agentId, alertId }: DetonationAlertsPivot): string | null => {
  if (alertId) {
    return `kibana.alert.uuid: "${escapeKqlValue(alertId)}"`;
  }
  if (agentId) {
    return `agent.id: "${escapeKqlValue(agentId)}"`;
  }
  if (sampleHash) {
    return `file.hash.sha256: "${escapeKqlValue(sampleHash)}"`;
  }
  return null;
};

/**
 * Both fields are matched because a technique reaches an alert either from the endpoint behavior
 * rule, as `threat`, or from the detection rule's own mapping, as `kibana.alert.rule.threat`.
 */
const buildTechniqueClause = (techniqueId: string): string => {
  const escaped = escapeKqlValue(techniqueId);
  return `(threat.technique.id: "${escaped}" or kibana.alert.rule.threat.technique.id: "${escaped}")`;
};

/**
 * Unlike the identifiers, a technique narrows rather than replaces: it is combined with whichever
 * scope was resolved, so pivoting from the ATT&CK panel stays inside the one detonation.
 */
const buildQuery = (pivot: DetonationAlertsPivot): string | null => {
  const scope = buildScope(pivot);
  if (scope === null) {
    return null;
  }
  if (!pivot.techniqueId) {
    return scope;
  }
  return `${scope} and ${buildTechniqueClause(pivot.techniqueId)}`;
};

/**
 * Opens the Security Alerts page filtered to a single detonation, so a row on the Detonate page
 * leads straight to the alerts it produced.
 *
 * The query and range are dispatched rather than appended to the URL. Security reads URL state once
 * when the app boots and drives it from the store afterwards, so params added on an in-app
 * navigation would be stripped straight back out again.
 */
export const useNavigateToDetonationAlerts = () => {
  const { navigateTo } = useNavigation();
  const { filterManager } = useKibana().services.data.query;
  const dispatch = useDispatch();

  const navigateToAlerts = useCallback(
    (pivot: DetonationAlertsPivot) => {
      const query = buildQuery(pivot);
      if (query === null) {
        return;
      }

      dispatch(
        inputsActions.setFilterQuery({ id: InputsModelId.global, query, language: 'kuery' })
      );

      // Filters left over from an earlier visit would silently narrow the pivot. Pinned filters are
      // the user's deliberate cross-page context, so only the app ones are dropped.
      filterManager.setAppFilters([]);
      dispatch(
        inputsActions.setSearchBarFilter({
          id: InputsModelId.global,
          filters: filterManager.getFilters(),
        })
      );

      const range = buildAbsoluteRange(pivot.timestamp ?? null);
      if (range) {
        dispatch(inputsActions.setAbsoluteRangeDatePicker({ id: InputsModelId.global, ...range }));
      }

      navigateTo({ deepLinkId: SecurityPageName.alerts });
    },
    [dispatch, filterManager, navigateTo]
  );

  return { navigateToAlerts };
};
