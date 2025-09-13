# !!!!!!!!! IMPORTANT !!!!!!!!!
# Using nats:alpine instead of nats:latest because default nats image is extremely minimal
# and doesn't have shell or any other uitls which makes it very hard to run /entrypoint.sh script.
# For the sake of simplicity for now just using nats:alpine image.
# Even though nats official documentation warns about using alpine images in production,
# !!!!!!!!! IMPORTANT !!!!!!!!!

# Use official NATS image as the base
FROM nats:alpine

# Install curl, openssl, and AWS CLI for ECS metadata queries, health checks, SSL, and CloudMap registration
RUN apk add --no-cache curl openssl aws-cli

# Copy our config file
COPY nats-server.conf /opt/nats/nats-server.conf

# Create and copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
