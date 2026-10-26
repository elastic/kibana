# Prebuilt Rules Package Generation

This package provides a small toolkit to generate mock prebuilt detection rule assets packed in a Fleet package compatible with the Security prebuilt rules workflow. It could be used to generate payload for stress and performance testing.

# Details

The toolkit uses a mock prebuilt rule asset mimicking a quite heavy real one with large setup and investigation guides. This prebuilt rule asset is multiplied by the desired N with an ability to add M historical prebuilt rule assets.

# Running the script

The script requires the following parameters

- `--packageSemver` - package version in a semver format. e.g. `9.2.0`
- `--numOfRules` - the total number of prebuilt rule assets with the recent version, e.g. `3000`

and the following optional parameters could be specified

- `--packageName` - a desired package name, by default `security_detection_engine` is used
- `--numOfHistoricalVersions` - a number of historical prebuilt rule assets per each recent version prebuilt rule asset, zero by default
- `--output` or `-o` - output directory path, by default current user's home directory is used

For example the following command

```bash
node ./x-pack/solutions/security/packages/test-api-clients/scripts/prebuilt_rules/generate_package.js --packageSemver 99.0.0 --numOfRules 3000 --numOfHistoricalVersions 2
```

would output the following logs

```bash
 info 🪄 Generating prebuilt rules package...
 debg Total 9000 prebuilt rules assets will be generated (3000 latest version prebuilt rules assets + 6000 historical prebuilt rules assets)
 succ 📦 Generated package has been written to <home path>/security_detection_engine-99.0.0.zip (173.93 MB)
```

and it'd generate a package `security_detection_engine-99.0.0.zip` in the current user's home folder.
