'use strict'

import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'
import * as dockerBuild from '@pulumi/docker-build'

// Local helper function (avoiding import issues)
const formatStageResourceName = (resourceName: string, orgName: string, stageName: string): string =>
    `${resourceName}-${orgName}-${stageName}`

const { ORG_NAME, STAGE } = process.env

export interface ServiceDiscoverySidecarArgs {
    // Route53 configuration for public IP registration
    route53HostedZoneId: pulumi.Input<string>
    natsRecordName: string  // e.g., "nats.shelby-dev.lixpi.dev"

    // ECS cluster to monitor
    ecsCluster: {
        arn: pulumi.Output<string>
        name: pulumi.Output<string>
    }

    // VPC configuration for Lambda
    vpc: aws.ec2.Vpc
    privateSubnets: aws.ec2.Subnet[]

    // Lambda configuration
    functionName?: string
    timeout?: number
    memorySize?: number

    // Docker build context for Lambda
    dockerBuildContext: string
    dockerfilePath: string
}

export const createServiceDiscoverySidecar = async (args: ServiceDiscoverySidecarArgs) => {
    const {
        route53HostedZoneId,
        natsRecordName,
        ecsCluster,
        vpc,
        privateSubnets,
        functionName = 'nats-sd',
        timeout = 60,
        memorySize = 512,
        dockerBuildContext,
        dockerfilePath,
    } = args

    // Format names consistently
    const formattedFunctionName = formatStageResourceName(functionName, ORG_NAME || 'lixpi', STAGE || 'dev')

    // Create ECR Repository for Lambda
    const repository = new aws.ecr.Repository(`${formattedFunctionName}-repo`, {
        name: formattedFunctionName.toLowerCase(),
        imageScanningConfiguration: {
            scanOnPush: true,
        },
        imageTagMutability: 'MUTABLE',
        forceDelete: true,
    })

    // Create container image in ECR using Docker provider
    const imageTag = `${Date.now()}`;
    const image = new dockerBuild.Image(`${formattedFunctionName}-image-${imageTag}`, {
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

    // Lambda execution role
    const lambdaRole = new aws.iam.Role(`${formattedFunctionName}-role`, {
        assumeRolePolicy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
                Action: 'sts:AssumeRole',
                Effect: 'Allow',
                Principal: {
                    Service: 'lambda.amazonaws.com',
                },
            }],
        }),
    })

    // Attach basic Lambda execution policy
    new aws.iam.RolePolicyAttachment(`${formattedFunctionName}-basic-execution`, {
        role: lambdaRole.name,
        policyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    })

    // Attach VPC execution policy for Lambda in VPC
    new aws.iam.RolePolicyAttachment(`${formattedFunctionName}-vpc-execution`, {
        role: lambdaRole.name,
        policyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole',
    })

    // Custom policy for Route53, ECS operations
    const lambdaPolicy = new aws.iam.Policy(`${formattedFunctionName}-policy`, {
        policy: pulumi.all([route53HostedZoneId]).apply(([hostedZoneId]) =>
            JSON.stringify({
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Action: [
                            'route53:ChangeResourceRecordSets',
                            'route53:ListResourceRecordSets',
                            'route53:GetChange'
                        ],
                        Resource: [
                            `arn:aws:route53:::hostedzone/${hostedZoneId}`,
                            'arn:aws:route53:::change/*'
                        ]
                    },
                    {
                        Effect: 'Allow',
                        Action: [
                            'ecs:DescribeTasks',
                            'ecs:DescribeContainerInstances',
                            'ecs:ListTasks',
                        ],
                        Resource: '*',
                    },
                    {
                        Effect: 'Allow',
                        Action: [
                            'ec2:DescribeNetworkInterfaces',
                        ],
                        Resource: '*',
                    },
                    {
                        Effect: 'Allow',
                        Action: [
                            'route53:CreateHealthCheck',
                            'route53:DeleteHealthCheck',
                            'route53:UpdateHealthCheck',
                            'route53:GetHealthCheck',
                            'route53:ListHealthChecks',
                        ],
                        Resource: '*',
                    },
                ],
            })
        )
    })

    new aws.iam.RolePolicyAttachment(`${formattedFunctionName}-policy-attachment`, {
        role: lambdaRole.name,
        policyArn: lambdaPolicy.arn,
    })

    // Security group for Lambda
    const lambdaSecurityGroup = new aws.ec2.SecurityGroup(`${formattedFunctionName}-sg`, {
        vpcId: vpc.id,
        description: 'Security group for NATS service discovery Lambda',
        egress: [
            {
                protocol: '-1',
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ['0.0.0.0/0'],
                description: 'Allow all outbound traffic',
            },
        ],
        tags: { Name: `${formattedFunctionName}-SG` },
    }, {
        // Ensure security group is created after VPC but deleted before VPC
        deleteBeforeReplace: true,
    })

    // CloudWatch Log Group for Lambda
    const logGroup = new aws.cloudwatch.LogGroup(`${formattedFunctionName}-logs`, {
        name: `/aws/lambda/${formattedFunctionName}`,
        retentionInDays: 7,
    })

    // Lambda function using Container Image
    const lambdaFunction = new aws.lambda.Function(`${formattedFunctionName}-func`, {
        name: formattedFunctionName,
        role: lambdaRole.arn,
        packageType: 'Image',
        imageUri: pulumi.interpolate`${repository.repositoryUrl}:${imageTag}`,
        timeout: timeout,
        memorySize: memorySize,
        environment: {
            variables: {
                ROUTE53_HOSTED_ZONE_ID: route53HostedZoneId,
                NATS_RECORD_NAME: natsRecordName,
                ECS_CLUSTER_ARN: ecsCluster.arn,
            },
        },
        vpcConfig: {
            subnetIds: privateSubnets.map(subnet => subnet.id),
            securityGroupIds: [lambdaSecurityGroup.id],
        },
    }, {
        dependsOn: [image, logGroup],
        // Ensure Lambda is deleted before VPC components by marking VPC dependencies
        deleteBeforeReplace: true,
        // Add custom timeouts for faster cleanup and explicit dependency on VPC resources
        customTimeouts: {
            create: '5m',
            update: '5m',
            delete: '15m', // Longer delete timeout for ENI cleanup
        },
        // Ensure deletion order by depending on VPC resources
        ignoreChanges: ['vpcConfig'],
        // Force replacement when Route53 configuration changes
        replaceOnChanges: ['environment.variables.ROUTE53_HOSTED_ZONE_ID', 'environment.variables.NATS_RECORD_NAME'],
    })

    // CloudWatch Event Rule for ECS Task State Changes
    const ecsTaskStateRule = new aws.cloudwatch.EventRule(`${formattedFunctionName}-rule`, {
        description: 'Capture ECS task state changes for NATS service discovery',
        eventPattern: ecsCluster.arn.apply(clusterArn => JSON.stringify({
            source: ['aws.ecs'],
            'detail-type': ['ECS Task State Change'],
            detail: {
                clusterArn: [clusterArn],
            },
        })),
    })

    // Permission for CloudWatch Events to invoke Lambda
    const lambdaPermission = new aws.lambda.Permission(`${formattedFunctionName}-perm`, {
        action: 'lambda:InvokeFunction',
        function: lambdaFunction.name,
        principal: 'events.amazonaws.com',
        sourceArn: ecsTaskStateRule.arn,
    })

    // CloudWatch Event Target - Lambda function
    const ecsTaskStateTarget = new aws.cloudwatch.EventTarget(`${formattedFunctionName}-target`, {
        rule: ecsTaskStateRule.name,
        arn: lambdaFunction.arn,
    }, {
        dependsOn: [lambdaPermission],
    })

    return {
        repository,
        image,
        lambdaFunction,
        lambdaRole,
        lambdaPolicy,
        lambdaSecurityGroup,
        logGroup,
        ecsTaskStateRule,
        ecsTaskStateTarget,

        outputs: {
            functionName: lambdaFunction.name,
            functionArn: lambdaFunction.arn,
            imageUri: pulumi.interpolate`${repository.repositoryUrl}:${imageTag}`,
        },
    }
}
