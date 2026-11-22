/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The connector fields `getInitialConnectorId` reads */
export interface InitialConnectorCandidate {
  id: string;
  /** Set by the Model Settings connectors route on the models the feature recommends */
  isRecommended?: boolean;
}

/**
 * Returns the connector Attack Discovery selects when the user has not picked one.
 *
 * The connector list leads with the models the Attack Discovery Model Settings row recommends,
 * ahead of the global default connector, so the first connector is selected. When no recommended
 * model is listed (none are provisioned, e.g. a stateful deployment without EIS), the list is in
 * catalog order, so the global default connector is selected instead, when it is listed.
 *
 * Known limitation: a list an admin saved in Model Settings carries no `isRecommended` flags, so
 * when it has 2 or more models and the global default is one of them but not the first, the global
 * default is selected rather than the admin's first saved model (which the run step uses). Telling
 * the two lists apart needs the connectors route's `soEntryFound`, which `useLoadConnectors` does
 * not report reliably here (on the Attacks page another caller runs the same query first), so this
 * is left to a follow-up.
 */
export const getInitialConnectorId = ({
  aiConnectors,
  globalDefaultConnectorId,
}: {
  aiConnectors: readonly InitialConnectorCandidate[];
  globalDefaultConnectorId: string | undefined;
}): string | undefined => {
  const hasRecommendedConnector = aiConnectors.some(({ isRecommended }) => isRecommended === true);

  const globalDefaultConnector = hasRecommendedConnector
    ? undefined
    : aiConnectors.find(({ id }) => id === globalDefaultConnectorId);

  return globalDefaultConnector?.id ?? aiConnectors[0]?.id;
};
