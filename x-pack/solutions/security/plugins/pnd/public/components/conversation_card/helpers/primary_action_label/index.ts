/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndGateId } from '@kbn/pnd-common';
import { getGateDefinitionByGateId, PND_GATE_IDS } from '@kbn/pnd-common';

import * as i18n from '../../translations';

/**
 * The prototype authors this string per alert (`primaryAction.label`, e.g. `Revoke active
 * sessions`) as fixture data. PND has no such field and will not invent one: a proposal row is the
 * worst possible place for placeholder text. What it does have is four gates, each of which always
 * asks the same question — so the verb is a property of the gate, keyed here rather than persisted.
 *
 * Typed as a total map over {@link PndGateId}, so a fifth gate cannot reach the registry without a
 * label: the alternative is a row that silently drops its action.
 */
const LABEL_BY_GATE_ID: Readonly<Record<PndGateId, string>> = {
  [PND_GATE_IDS.applyTuning]: i18n.PRIMARY_ACTION_APPLY_TUNING,
  [PND_GATE_IDS.incidentContained]: i18n.PRIMARY_ACTION_CONFIRM_CONTAINMENT,
  [PND_GATE_IDS.openInvestigation]: i18n.PRIMARY_ACTION_OPEN_INVESTIGATION,
  [PND_GATE_IDS.promoteIncident]: i18n.PRIMARY_ACTION_PROMOTE_INCIDENT,
};

/**
 * What the row's pending decision would *do*, as the label of its leading action.
 *
 * The action is not a second way to decide: it opens the same approval modal the row itself opens,
 * which is what the prototype does too (`handlePrimaryClick` routes every primary action through
 * the HITL card). Naming it is the whole point — an analyst can read a queue of four gates without
 * opening four modals to learn which is which.
 *
 * Fail-closed like every other registry lookup: a gate id the registry does not know yields no
 * action rather than a guess at its verb.
 */
export const primaryActionLabel = (gateId: string): string | undefined => {
  const gate = getGateDefinitionByGateId(gateId);

  return gate == null ? undefined : LABEL_BY_GATE_ID[gate.gateId];
};
