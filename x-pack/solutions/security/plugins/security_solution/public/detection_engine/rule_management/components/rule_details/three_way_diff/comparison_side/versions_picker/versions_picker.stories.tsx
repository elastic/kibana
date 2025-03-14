/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { VersionsPicker, VersionsPickerOptionEnum } from './versions_picker';

export default {
  component: VersionsPicker,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/VersionsPicker',
};

export const Default = () => {
  const options = [VersionsPickerOptionEnum.MyChanges, VersionsPickerOptionEnum.UpdateFromElastic];
  const [selectedOption, setSelectedOption] = useState<VersionsPickerOptionEnum>(options[0]);

  return (
    <VersionsPicker
      options={options}
      selectedOption={selectedOption}
      onChange={setSelectedOption}
    />
  );
};
