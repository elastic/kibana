# Package verification fixtures


## Signatures folder
This directory contains a public private key pair to be used for testing package verification. These keys are purely for testing and do not contain or sign any sensitive information. Here is the key information:

```
pub   rsa3072 2022-07-21 [SC]
      EA69DC1F612FABF267850741D2A182A7B0E00C14
uid           [ultimate] Fleet Test (Fleet Integration Test Key) <fleet@elastic.co>
```

The passphrase of the private key is 'test'

### How were the keys generated?

*Note: the key ID will be different.*
```
gpg --full-generate-key
# Kind: RSA
# Keysize: 3072
# Valid for: 0 (does not expire)
# Real name: Fleet Test
# Email address: fleet@elastic.co
# Comment: Fleet Integration Test Key
# Passphrase: test
gpg --armor --export EA69DC1F612FABF267850741D2A182A7B0E00C14 > fleet_test_key_public.asc
gpg --armor --export-secret-keys EA69DC1F612FABF267850741D2A182A7B0E00C14 > fleet_test_key_private.asc
```

After generating the keys, you may want to delete them from your local keystore: 
```
gpg --delete-secret-keys EA69DC1F612FABF267850741D2A182A7B0E00C14
gpg --delete-keys EA69DC1F612FABF267850741D2A182A7B0E00C14
```
## Packages folder

## How were the packages generated?

The valid package was generated with the following commands:
```
export ELASTIC_PACKAGE_SIGNER_PRIVATE_KEYFILE=../../../signatures/fleet_test_key_private.asc
export ELASTIC_PACKAGE_SIGNER_PASSPHRASE=test
cd packages/src/verified-1.0.0
elastic-package build --zip --sign -v

# if successful then the last log line will contain:
# Signature file written: /<path to you kibana>/kibana/build/packages/verified-1.0.0.zip.sig
# Package built: /<path to you kibana>/kibana/build/packages/verified-1.0.0.zip

cp /<path to you kibana>/kibana/build/packages/verified-1.0.0.zip ../../zips/
cp /<path to you kibana>/kibana/build/packages/verified-1.0.0.zip.sig ../../zips/
```