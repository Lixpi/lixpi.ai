'use strict'

import * as process from 'process'
import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

// INFO
// Provider	               Use cases
// @pulumi/docker-build	   Anything related to building images with docker build.
// @pulumi/docker	       Everything else – including running containers and creating networks.
import * as dockerBuild from '@pulumi/docker-build'



import {
    formatStageResourceName,
} from '@lixpi/constants'

const {
    ORG_NAME,
    STAGE
} = process.env

// Configuration interface for the main API service
export interface MainApiServiceArgs {
    // Infrastructure
    ecsCluster: {
        id: pulumi.Output<string>
        arn: pulumi.Output<string>
        name: pulumi.Output<string>
    }
    vpc: aws.ec2.Vpc
    publicSubnets: aws.ec2.Subnet[]
    privateSubnets: aws.ec2.Subnet[]

    // Service specific
    serviceName?: string
    containerPort?: number
    cpu?: number
    memory?: number
    desiredCount?: number

    // Domain & TLS
    domainName: string
    // hostedZoneId: string
    // hostedZoneName: string
    // certificateArn: pulumi.Input<string>

    // Resource bindings
    resourceBindings: {
        tables?: {
            [key: string]: aws.dynamodb.Table
        }
        functions?: {
            [key: string]: aws.lambda.Function
        }
        topics?: {
            [key: string]: aws.sns.Topic
        }
        queues?: {
            [key: string]: aws.sqs.Queue
        }
    }

    // App configuration
    environment: {
        NODE_OPTIONS: string

        AWS_REGION: string

        STAGE: string
        ORG_NAME: string
        ENVIRONMENT: string

        NATS_SERVERS: string
        NATS_AUTH_ACCOUNT: string
        NATS_SYS_USER_PASSWORD: string
        NATS_REGULAR_USER_PASSWORD: string
        NATS_AUTH_NKEY_ISSUER_SEED: string
        NATS_AUTH_NKEY_ISSUER_PUBLIC: string
        NATS_AUTH_XKEY_ISSUER_SEED: string
        NATS_AUTH_XKEY_ISSUER_PUBLIC: string

        ORIGIN_HOST_URL: string
        API_HOST_URL: string

        AUTH0_DOMAIN: string
        AUTH0_API_IDENTIFIER: string
        SAVE_LLM_RESPONSES_TO_DEBUG_DIR: string

        OPENAI_API_KEY: string
        ANTHROPIC_API_KEY: string
    }

    // Docker build context
    dockerBuildContext: string
    dockerfilePath: string
}

export const createMainApiService = async (args: MainApiServiceArgs) => {
    const {
        ecsCluster,
        vpc,
        publicSubnets,
        privateSubnets,
        serviceName = 'api',
        containerPort = 3000,
        cpu = 512,        // 0.5 vCPU
        memory = 512,    // 512 MiB
        desiredCount = 1,

        domainName,
        // certificateArn,

        resourceBindings,
        environment,
        dockerBuildContext,
        dockerfilePath,
    } = args

    const serviceDomainName = `${serviceName}-${domainName}`

    // Format names consistently
    const formattedServiceName = formatStageResourceName(serviceName, ORG_NAME, STAGE)
    // const loadBalancerName = formatStageResourceName(`${serviceName}-ALB`, ORG_NAME, STAGE)

    // Create ECR Repository
    const repository = new aws.ecr.Repository(`${formattedServiceName}-repo`, {
        name: formattedServiceName.toLowerCase(),
        imageScanningConfiguration: {
            scanOnPush: true,
        },
        imageTagMutability: 'MUTABLE',
        forceDelete: true,
    })

    // Create container image in ECR using Docker provider
    // Use timestamp to ensure unique tags for each deployment
    const imageTag = `${Date.now()}`;
    const image = new dockerBuild.Image(`${formattedServiceName}-image-${imageTag}`, {
        context: {
            location: dockerBuildContext,
        },
        dockerfile: {
            location: dockerfilePath,
        },
        platforms: ['linux/amd64'],
        tags: [
            pulumi.interpolate`${repository.repositoryUrl}:${imageTag}`,
            pulumi.interpolate`${repository.repositoryUrl}:latest`
        ],
        push: true,
        registries: [
            {
                address: repository.repositoryUrl,
                username: aws.ecr.getAuthorizationTokenOutput({}).userName,
                password: aws.ecr.getAuthorizationTokenOutput({}).password,
            }
        ],
        buildOnPreview: true,
        noCache: true,
    }, {
        replaceOnChanges: ['*'],
        dependsOn: [repository],
    });

    // ECS Task Execution Role - used by ECS agent
    const executionRole = new aws.iam.Role(`${formattedServiceName}-execution-role`, {
        assumeRolePolicy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
                Action: 'sts:AssumeRole',
                Effect: 'Allow',
                Principal: {
                    Service: 'ecs-tasks.amazonaws.com',
                },
            }],
        }),
    })

    // Attach policies for task execution
    new aws.iam.RolePolicyAttachment(`${formattedServiceName}-execution-policy`, {
        role: executionRole.name,
        policyArn: 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
    })

    // Add ECR permissions to allow pulling images
    new aws.iam.RolePolicyAttachment(`${formattedServiceName}-ecr-policy`, {
        role: executionRole.name,
        policyArn: 'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly',
    });

    // ECS Task Role - used by the containers
    const taskRole = new aws.iam.Role(`${formattedServiceName}-task-role`, {
        assumeRolePolicy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
                Action: 'sts:AssumeRole',
                Effect: 'Allow',
                Principal: {
                    Service: 'ecs-tasks.amazonaws.com',
                },
            }],
        }),
    })

    // Allow containers to access bound DynamoDB tables
    resourceBindings.tables && Object.values(resourceBindings.tables).forEach((table, i) => {
        const tablePolicy = new aws.iam.Policy(`${formattedServiceName}-dynamo-policy-${i}`, {
            policy: table.arn.apply(arn => JSON.stringify({
                Version: '2012-10-17',
                Statement: [{
                    Effect: 'Allow',
                    Action: [
                        'dynamodb:BatchGetItem',
                        'dynamodb:GetItem',
                        'dynamodb:Query',
                        'dynamodb:Scan',
                        'dynamodb:BatchWriteItem',
                        'dynamodb:PutItem',
                        'dynamodb:UpdateItem',
                        'dynamodb:DeleteItem',
                    ],
                    Resource: [arn, `${arn}/index/*`],
                }],
            })),
        })

        new aws.iam.RolePolicyAttachment(`${formattedServiceName}-dynamo-attachment-${i}`, {
            role: taskRole.name,
            policyArn: tablePolicy.arn,
        })
    })

    // // Allow containers to access bound SQS queues
    // resourceBindings.queues && Object.values(resourceBindings.queues).forEach((queue, i) => {
    //     const sqsPolicy = new aws.iam.Policy(`${formattedServiceName}-sqs-policy-${i}`, {
    //         policy: queue.arn.apply(arn => JSON.stringify({
    //             Version: '2012-10-17',
    //             Statement: [{
    //                 Effect: 'Allow',
    //                 Action: [
    //                     'sqs:ReceiveMessage',
    //                     'sqs:DeleteMessage',
    //                     'sqs:GetQueueAttributes',
    //                     'sqs:ChangeMessageVisibility',
    //                 ],
    //                 Resource: arn,
    //             }],
    //         })),
    //     })

    //     new aws.iam.RolePolicyAttachment(`${formattedServiceName}-sqs-attachment-${i}`, {
    //         role: taskRole.name,
    //         policyArn: sqsPolicy.arn,
    //     })
    // })

    // // Allow containers to access SNS topics
    // resourceBindings.topics && Object.values(resourceBindings.topics).forEach((topic, i) => {
    //     const snsPolicy = new aws.iam.Policy(`${formattedServiceName}-sns-policy-${i}`, {
    //         policy: topic.arn.apply(arn => JSON.stringify({
    //             Version: '2012-10-17',
    //             Statement: [{
    //                 Effect: 'Allow',
    //                 Action: ['sns:Publish'],
    //                 Resource: arn,
    //             }],
    //         })),
    //     })

    //     new aws.iam.RolePolicyAttachment(`${formattedServiceName}-sns-attachment-${i}`, {
    //         role: taskRole.name,
    //         policyArn: snsPolicy.arn,
    //     })
    // })

    // // Allow containers to invoke Lambda functions
    // resourceBindings.functions && Object.values(resourceBindings.functions).forEach((func, i) => {
    //     const lambdaPolicy = new aws.iam.Policy(`${formattedServiceName}-lambda-policy-${i}`, {
    //         policy: func.arn.apply(arn => JSON.stringify({
    //             Version: '2012-10-17',
    //             Statement: [{
    //                 Effect: 'Allow',
    //                 Action: ['lambda:InvokeFunction'],
    //                 Resource: arn,
    //             }],
    //         })),
    //     })

    //     new aws.iam.RolePolicyAttachment(`${formattedServiceName}-lambda-attachment-${i}`, {
    //         role: taskRole.name,
    //         policyArn: lambdaPolicy.arn,
    //     })
    // })

    // Allow containers to access SSM parameters
    const ssmPolicy = new aws.iam.Policy(`${formattedServiceName}-ssm-policy`, {
        policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
                Effect: 'Allow',
                Action: [
                    'ssm:GetParameters',
                    'ssm:GetParameter',
                ],
                Resource: `arn:aws:ssm:${aws.config.region}:${aws.config.accountId}:parameter/*`,
            }],
        }),
    })

    new aws.iam.RolePolicyAttachment(`${formattedServiceName}-ssm-attachment`, {
        role: taskRole.name,
        policyArn: ssmPolicy.arn,
    })

    // Create CloudWatch Log Group for Container
    const logGroup = new aws.cloudwatch.LogGroup(`${formattedServiceName}-logs`, {
        name: `/aws/ecs/${formattedServiceName}`,
        retentionInDays: 7,
    })

    // Create ECS Task Definition
    const taskDefinition = new aws.ecs.TaskDefinition(`${formattedServiceName}-task`, {
        family: formattedServiceName,
        cpu: `${cpu}`,
        memory: `${memory}`,
        networkMode: 'awsvpc',
        requiresCompatibilities: ['FARGATE'],
        executionRoleArn: executionRole.arn,
        taskRoleArn: taskRole.arn,
        containerDefinitions: pulumi.all([
            logGroup.name,
            repository.repositoryUrl,
            imageTag,
        ]).apply(([logGroupName, repositoryUrl, tag]) => JSON.stringify([{
            name: formattedServiceName,
            image: `${repositoryUrl}:${tag}`,
            cpu: cpu,
            memory: memory,
            essential: true,
            portMappings: [{
                containerPort: containerPort,
                protocol: 'tcp',
            }],
            environment: Object.entries(environment).map(([name, value]) => ({
                name,
                value: value || '',
            })),
            logConfiguration: {
                logDriver: 'awslogs',
                options: {
                    'awslogs-group': logGroupName,
                    'awslogs-region': aws.config.region,
                    'awslogs-stream-prefix': 'ecs',
                    'awslogs-create-group': 'true'
                },
            },
            healthCheck: {
                command: ['CMD-SHELL', `curl -f http://localhost:${containerPort}/health-check || exit 1`],
                interval: 10,
                timeout: 5,
                retries: 2,
                startPeriod: 5,
            },
        }])),
    }, {
        dependsOn: [image],  // Ensure image is fully built and pushed before creating task definition
    })

    // Security group for the load balancer
    // const lbSecurityGroup = new aws.ec2.SecurityGroup(`${formattedServiceName}-lb-sg`, {
    //     vpcId: vpc.id,
    //     description: 'Security group for the API load balancer',
    //     ingress: [
    //         {
    //             // Allow HTTP traffic from anywhere
    //             protocol: 'tcp',
    //             fromPort: 80,
    //             toPort: 80,
    //             cidrBlocks: ['0.0.0.0/0'],
    //             description: 'Allow HTTP inbound traffic',
    //         },
    //         {
    //             // Allow HTTPS traffic from anywhere
    //             protocol: 'tcp',
    //             fromPort: 443,
    //             toPort: 443,
    //             cidrBlocks: ['0.0.0.0/0'],
    //             description: 'Allow HTTPS inbound traffic',
    //         },
    //     ],
    //     egress: [
    //         {
    //             // Allow all outbound traffic
    //             protocol: '-1',
    //             fromPort: 0,
    //             toPort: 0,
    //             cidrBlocks: ['0.0.0.0/0'],
    //             description: 'Allow all outbound traffic',
    //         },
    //     ],
    // })

    // Security group for the ECS tasks
    const taskSecurityGroup = new aws.ec2.SecurityGroup(`${formattedServiceName}-task-sg`, {
        vpcId: vpc.id,
        description: 'Security group for the API ECS tasks',
        ingress: [
            // {
            //     // Allow traffic from the load balancer security group to container port
            //     protocol: 'tcp',
            //     fromPort: containerPort,
            //     toPort: containerPort,
            //     securityGroups: [lbSecurityGroup.id],
            //     description: 'Allow inbound traffic from the load balancer',
            // },
        ],
        egress: [
            {
                // Allow all outbound traffic
                protocol: '-1',
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ['0.0.0.0/0'],
                description: 'Allow all outbound traffic',
            },
        ],
    })

    // Create Application Load Balancer
    // const loadBalancer = new aws.lb.LoadBalancer(loadBalancerName, {
    //     name: loadBalancerName,
    //     internal: false,
    //     loadBalancerType: 'application',
    //     securityGroups: [lbSecurityGroup.id],
    //     subnets: publicSubnets.map(subnet => subnet.id),
    //     enableDeletionProtection: false,
    //     idleTimeout: 60,
    //     tags: {
    //         Name: loadBalancerName,
    //     },
    // })

    // Create target group for the ECS service
    // const targetGroup = new aws.lb.TargetGroup(`${formattedServiceName}-tg`, {
    //     name: formatStageResourceName(`${serviceName}-tg`, ORG_NAME, STAGE),
    //     port: containerPort,
    //     protocol: 'HTTP',
    //     targetType: 'ip',
    //     vpcId: vpc.id,
    //     deregistrationDelay: 30,
    //     healthCheck: {
    //         enabled: true,
    //         path: '/health-check',
    //         port: 'traffic-port',
    //         healthyThreshold: 2,
    //         unhealthyThreshold: 2,
    //         timeout: 5, // must be less than interval
    //         interval: 10,
    //         matcher: '200,302',
    //     },
    //     stickiness: {
    //         type: 'lb_cookie',
    //         cookieDuration: 3 * 60 * 60,  // 3 hours
    //         enabled: true,
    //     },
    // })

    // Create HTTPS listener
    // const httpsListener = new aws.lb.Listener(`${formattedServiceName}-https-listener`, {
    //     loadBalancerArn: loadBalancer.arn,
    //     port: 443,
    //     protocol: 'HTTPS',
    //     sslPolicy: 'ELBSecurityPolicy-2016-08',
    //     certificateArn: certificateArn,
    //     defaultActions: [{
    //         type: 'forward',
    //         targetGroupArn: targetGroup.arn,
    //     }],
    // }, {
    //     // dependsOn: []
    // })

    // Create HTTP listener that redirects to HTTPS
    // const httpListener = new aws.lb.Listener(`${formattedServiceName}-http-listener`, {
    //     loadBalancerArn: loadBalancer.arn,
    //     port: 80,
    //     protocol: 'HTTP',
    //     defaultActions: [{
    //         type: 'redirect',
    //         redirect: {
    //             port: '443',
    //             protocol: 'HTTPS',
    //             statusCode: 'HTTP_301',
    //         },
    //     }],
    // })

    // Create ECS Service
    const ecsService = new aws.ecs.Service(`${formattedServiceName}-service`, {
        cluster: ecsCluster.id,
        taskDefinition: taskDefinition.arn,
        desiredCount,
        launchType: 'FARGATE',
        schedulingStrategy: 'REPLICA',
        deploymentMinimumHealthyPercent: 50,
        deploymentMaximumPercent: 200,
        deploymentCircuitBreaker: {
            enable: true,
            rollback: true
        },
        networkConfiguration: {
            subnets: privateSubnets.map(subnet => subnet.id),  // Changed from publicSubnets to privateSubnets
            securityGroups: [taskSecurityGroup.id],
            assignPublicIp: false,  // Changed from true to false since we're in private subnets
        },
        // loadBalancers: [{
        //     targetGroupArn: targetGroup.arn,
        //     containerName: formattedServiceName,
        //     containerPort: containerPort,
        // }],
        // healthCheckGracePeriodSeconds: 30,
        forceNewDeployment: true,  // Ensure we deploy a fresh version on updates
        enableEcsManagedTags: true,
        propagateTags: 'SERVICE',
        waitForSteadyState: true,  // Wait until service reaches a steady state before considering deployment complete
        forceDelete: true,
    }, {
        customTimeouts: {
            create: '10m',
            update: '10m',
            delete: '10m',
        },
        // Force replacement when image changes
        replaceOnChanges: [
            "taskDefinition"
        ]
    })

    return {
        repository,
        image,
        taskDefinition,
        executionRole,
        taskRole,
        logGroup,
        // loadBalancer,
        // targetGroup,
        // httpsListener,
        // httpListener,
        ecsService,
        // lbSecurityGroup,
        taskSecurityGroup,

        // Outputs
        outputs: {
            serviceName: ecsService.name,
            serviceArn: ecsService.id,
            apiUrl: pulumi.interpolate`https://${serviceDomainName}`,
            // loadBalancerDns: loadBalancer.dnsName,
            // loadBalancerHostedZoneId: loadBalancer.zoneId,
            containerPort,
            serviceEndpoint: serviceDomainName,
        },
    }
}
