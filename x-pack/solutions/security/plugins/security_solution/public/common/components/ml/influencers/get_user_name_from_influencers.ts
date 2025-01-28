/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntries } from '../get_entries';

export const getUserNameFromInfluencers = (
  influencers: Array<Record<string, string>> = [],
  userName?: string
): string | null => {
  const recordFound = influencers.find((influencer) => {
    const [influencerName, influencerValue] = getEntries(influencer);
    if (influencerName === 'user.name') {
      if (userName == null) {
        return true;
      } else {
        return influencerValue === userName;
      }
    } else {
      return false;
    }
  });
  if (recordFound != null) {
    return Object.values(recordFound)[0];
  } else {
    return null;
  }
};
