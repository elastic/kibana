# PKI Fixtures

* `es_ca.key` - the CA key used to sign certificates from @kbn/dev-utils that are used and trusted by test Elasticsearch server.
* `first_client.p12` and `second_client.p12` - the client certificate bundles signed by `es_ca.key` and hence trusted by
both test Kibana and Elasticsearch servers.
* `untrusted_client.p12` - the client certificate bundle trusted by test Kibana server, but not test Elasticsearch test server.
* `kibana_ca.crt` and `kibana_ca.key` - the CA certificate and key trusted by test Kibana server only.