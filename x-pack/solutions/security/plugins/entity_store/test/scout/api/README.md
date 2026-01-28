### Running

Stop local running elasticsearch and kibana (the server brings it up)

Start the server for ECH stateful
```sh
node scripts/scout.js start-server --stateful
```

Or serverless security
```sh
node scripts/scout.js start-server --serverless=security
```

And then run
```sh
npx playwright test --config x-pack/solutions/security/plugins/entity_store/test/scout/api/playwright.config.ts --project=local
```

### Generating archives

```sh
node scripts/es_archiver.js save \
  x-pack/solutions/security/plugins/entity_store/test/scout/api/es_archives/updates \
  ".entities.v2.updates.*" --raw --keep-index-names \
    --es-url=http://elastic:changeme@localhost:9200 \
  --kibana-url=http://elastic:changeme@localhost:5601
```

:warn: Keep the mappings empty because it should be created by the entity store