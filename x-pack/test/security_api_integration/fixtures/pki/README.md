# PKI Fixtures

* `first_client.p12` and `second_client.p12` - the client certificate bundles signed by the Elastic Stack CA (in `kbn-dev-utils`)
and hence trusted by both test Kibana and Elasticsearch servers.
* `untrusted_client.p12` - the client certificate bundle trusted by test Kibana server, but not test Elasticsearch test server.
* `kibana_ca.crt` and `kibana_ca.key` - the CA certificate and key trusted by test Kibana server only.

The `first_client.p12` and `second_client.p12` files were generated the same time as the other certificates in `kbn-dev-utils`, using the
following commands:

```
bin/elasticsearch-certutil cert -days 18250 --ca $KIBANA_HOME/packages/kbn-dev-utils/certs/ca.p12 --ca-pass castorepass --name first_client --pass ""
bin/elasticsearch-certutil cert -days 18250 --ca $KIBANA_HOME/packages/kbn-dev-utils/certs/ca.p12 --ca-pass castorepass --name second_client --pass ""
```

If that CA is ever changed, these two files must be regenerated.
