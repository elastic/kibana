# PKI Fixtures

The client certificate bundles (`first_client.p12` and `second_client.p12`) are signed by the Elastic Stack CA (in `kbn-dev-utils`)
and hence trusted by both test Kibana and Elasticsearch servers. The files were generated the same time as the other certificates 
in `kbn-dev-utils`, using the following commands:

```
bin/elasticsearch-certutil cert -days 18250 --ca $KIBANA_HOME/packages/kbn-dev-utils/certs/ca.p12 --ca-pass castorepass --name first_client --pass ""
bin/elasticsearch-certutil cert -days 18250 --ca $KIBANA_HOME/packages/kbn-dev-utils/certs/ca.p12 --ca-pass castorepass --name second_client --pass ""
```

The CA certificate and key (`kibana_ca.crt` and `kibana_ca.key`) are used to sign client certificates (`untrusted_client.p12`) that are only trusted
by Kibana and not Elasticsearch. These files can be generated using the following commands:
```
export PKI_FIXTURES=$KIBANA_HOME/x-pack/test/security_api_integration/fixtures/pki
  
# Extract and rename CA files to kibana_ca.crt and kibana_ca.key
bin/elasticsearch-certutil ca --ca-dn "CN=Kibana CA" --days 18250 --pem
bin/elasticsearch-certutil cert -days 18250 --ca-key "${PKI_FIXTURES}/kibana_ca.key" --ca-cert "${PKI_FIXTURES}/kibana_ca.crt" --name untrusted_client --pass ""
```

If that CA is ever changed, these two files must be regenerated.
