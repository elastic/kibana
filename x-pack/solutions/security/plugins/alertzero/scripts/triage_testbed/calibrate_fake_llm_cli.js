/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');
require('@kbn/swc-register').install();

require('./calibrate_fake_llm')
  .main()
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
