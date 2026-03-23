#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wrapper script to run the TypeScript data generator
 * Uses @babel/register to transpile on-the-fly
 */

require('@babel/register')({
  extensions: ['.ts'],
  presets: [
    require.resolve('@babel/preset-typescript'),
    [require.resolve('@babel/preset-env'), { targets: { node: 'current' } }]
  ]
});

// Import and run the data generator
const { generateAESOPDemoData } = require('./data_generator.ts');

generateAESOPDemoData()
  .then(() => {
    console.log('\n✨ Demo environment ready for AESOP self-exploration!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to generate demo data:', error);
    process.exit(1);
  });
