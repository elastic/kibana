# MKI Serverless Quality Gates

This folder contains tests that **ONLY** run in the MKI Serverless Quality Gates. These tests are designed to ensure the security and functionality of the system in a serverless environment.

## Contributing

Please prefix the tests in this folder with `mki_` so that is clear to the following developer that these tests run only in MKI and Serverless Quality Gates.

New MKI only test files should be loaded from the root index.ts file of the mki_only directory

```
x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/mki_only/index.ts
```

If you would like to contribute to these tests, please follow the contribution guidelines outlined in the main project repository.
