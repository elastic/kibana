/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import fs from 'fs/promises';
import path from 'path';

export const bundlePackage = async (
  name: string,
  bundledPackageDir: string,
  bundledFleetPackageDir: string
) => {
  try {
    await fs.access(bundledFleetPackageDir);
  } catch (error) {
    await fs.mkdir(bundledFleetPackageDir, { recursive: true });
  }

  await fs.copyFile(
    path.join(bundledPackageDir, `${name}.zip`),
    path.join(bundledFleetPackageDir, `${name}.zip`)
  );
};

export const removeBundledPackages = async (bundledFleetPackageDir: string) => {
  const files = await fs.readdir(bundledFleetPackageDir);

  for (const file of files) {
    await fs.unlink(path.join(bundledFleetPackageDir, file));
    await fs.rm(bundledFleetPackageDir, { recursive: true });
  }
};
