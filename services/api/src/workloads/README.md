# Workloads

This directory contains code that wants to be decoupled as a set of independent functions and services, but isn't ready to do that yet.

I want this project to be as cloud agnostic as possible and therefore I don't want to utilize any specific workloads implementation like AWS Lmabda or GCP or Azure functions.

Ideally I want to use NATS NEX to run workloads, but that stuff is still a bit rough and doesn't support docker container yet, though they promise that it's on their roadmap.

So in the future this is going to be transfered to NATS NEX, but for now it's just a part of this main-api service.