# Create role/user utility

`create_role_and_user.sh` shell script facilitates roles and users creation process. It accepts only one `--role` parameter restricted to known role definitions (See `@kbn/security-solution-plugin/common/test/index.ts` for the roles list). Created user has role's name and this only role assigned.

## Expected environment variables

The following environment variables can be specified

- `ELASTICSEARCH_URL` Elasticsearch url e.g. `http://127.0.0.1:9200`
- `KIBANA_URL` Kibana url e.g. `http://127.0.0.1:560`
- `USERNAME` a user name to authenticate requests e.g. `elastic`
- `PASSWORD` a password to authenticate requests e.g. `changeme`

If an environment variable is not specified sensible defaults is used.

### Notes

1. When first starting up elastic, detections will not be available until you visit the page with a SOC Manager role or Platform Engineer role
2. Rule Author has the ability to create rules and create value lists

## Examples

For example to create `t1_analyst` user with `t1_analyst` role run the following command in the current folder

```bash
./create_role_and_user.sh --role=t1_analyst
```

Output

```
 warn Environment variable "ELASTICSEARCH_URL" is not set, using "http://127.0.0.1:9200" as a default value
 info Using environment variable KIBANA_URL=http://127.0.0.1:5601/kbn
 warn Environment variable "USERNAME" is not set, using "elastic" as a default value
 warn Environment variable "PASSWORD" is not set, using "changeme" as a default value
 info Creating role "t1_analyst"...
 info Role "t1_analyst" has been created
 info Creating user "t1_analyst"...
 info User "t1_analyst" has been created (password "changeme")
 succ Done
```