# JWKS Keys Caching

JWKS key don't seem to to be expiring at all and fetching them requires a public network access which is an extra step of complexity for the service running inside VPCs private subnets. So we're just caching them locally.

Sources:

https://community.auth0.com/t/auth0-failures-getting-well-known-jwks-json/13863

https://community.auth0.com/t/auth0-failures-getting-well-known-jwks-json/13863/9


# TODO: Though we don't want to have it on every single container instance.
A better approach should be used, like for example storing it in S3 bucket and then retrieve in the container.
Be careful with an extra delay, we probably don't want to load it from S3 for every auth request, or do we???

