/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState } from 'react';
import html2canvas from 'html2canvas';

export const useScreenshot = () => {
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const takeScreenshot = async () => {
    const element = document.getElementById('kibana-body');
    if (!element) {
      return null;
    }

    try {
      const canvas = await html2canvas(element);
      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);
    } catch (error) {
      setScreenshot(null);
    }
  };

  return {
    screenshot,
    takeScreenshot,
  };
};
