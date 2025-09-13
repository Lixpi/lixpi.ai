'use strict'

import * as process from 'process'
import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

import {
    getDynamoDbTableStageName
} from '@lixpi/constants'

const {
    ORG_NAME,
    STAGE,
    ENVIRONMENT,
} = process.env

export const createDynamoDbTables = async (opts?: { provider?: aws.Provider }) => {

    const resourceOpts: pulumi.CustomResourceOptions | undefined = opts?.provider ? { provider: opts.provider } : undefined
    const enableStreams = !opts?.provider
    // Only enable deletion protection for real AWS (no custom local provider) AND production environment
    const enableDeletionProtection = !opts?.provider && ENVIRONMENT === 'production'

    const usersTable = new aws.dynamodb.Table(getDynamoDbTableStageName('USERS', ORG_NAME, STAGE), {
        name: getDynamoDbTableStageName('USERS', ORG_NAME, STAGE),
        attributes: [
            { name: 'userId', type: 'S' },
        ],
        billingMode: 'PAY_PER_REQUEST',
        hashKey: 'userId',
        ...(enableDeletionProtection && { deletionProtectionEnabled: true }),
        ...(enableStreams && {
            streamEnabled: true as const,
            streamViewType: 'NEW_AND_OLD_IMAGES' as const,
        }),
        tags: {
            Name: getDynamoDbTableStageName('USERS', ORG_NAME, STAGE),
        },
    }, resourceOpts)

    const organizationsTable = new aws.dynamodb.Table(getDynamoDbTableStageName('ORGANIZATIONS', ORG_NAME, STAGE), {
        name: getDynamoDbTableStageName('ORGANIZATIONS', ORG_NAME, STAGE),
        attributes: [
            { name: 'organizationId', type: 'S' },
        ],
        billingMode: 'PAY_PER_REQUEST',
        hashKey: 'organizationId',
        ...(enableDeletionProtection && { deletionProtectionEnabled: true }),
        ...(enableStreams && {
            streamEnabled: true as const,
            streamViewType: 'NEW_AND_OLD_IMAGES' as const,
        }),
        tags: {
            Name: getDynamoDbTableStageName('ORGANIZATIONS', ORG_NAME, STAGE),
        },
    }, resourceOpts)

    const organizationsAccessListTable = new aws.dynamodb.Table(getDynamoDbTableStageName('ORGANIZATIONS_ACCESS_LIST', ORG_NAME, STAGE), {
        name: getDynamoDbTableStageName('ORGANIZATIONS_ACCESS_LIST', ORG_NAME, STAGE),
        attributes: [
            { name: 'userId', type: 'S' },
            { name: 'organizationId', type: 'S' },
            { name: 'createdAt', type: 'N' },
        ],
        billingMode: 'PAY_PER_REQUEST',
        hashKey: 'userId',
        rangeKey: 'organizationId',
        localSecondaryIndexes: [
            {
                name: 'createdAt',
                rangeKey: 'createdAt',
                projectionType: 'ALL',
            },
            {
                name: 'updatedAt',
                rangeKey: 'createdAt',
                projectionType: 'ALL',
            },
        ],
        ...(enableDeletionProtection && { deletionProtectionEnabled: true }),
        ...(enableStreams && {
            streamEnabled: true as const,
            streamViewType: 'NEW_AND_OLD_IMAGES' as const,
        }),
        tags: {
            Name: getDynamoDbTableStageName('ORGANIZATIONS_ACCESS_LIST', ORG_NAME, STAGE),
        },
    }, resourceOpts)

    const documentsTable = new aws.dynamodb.Table(getDynamoDbTableStageName('DOCUMENTS', ORG_NAME, STAGE), {
        name: getDynamoDbTableStageName('DOCUMENTS', ORG_NAME, STAGE),
        attributes: [
            { name: 'documentId', type: 'S' },
            { name: 'revision', type: 'N' },
            { name: 'createdAt', type: 'N' },
        ],
        billingMode: 'PAY_PER_REQUEST',
        hashKey: 'documentId',
        rangeKey: 'revision',
        localSecondaryIndexes: [
            {
                name: 'createdAt',
                rangeKey: 'createdAt',
                projectionType: 'ALL',
            },
            {
                name: 'updatedAt',
                rangeKey: 'createdAt',
                projectionType: 'ALL',
            },
        ],
        ...(enableDeletionProtection && { deletionProtectionEnabled: true }),
        ...(enableStreams && {
            streamEnabled: true as const,
            streamViewType: 'NEW_AND_OLD_IMAGES' as const,
        }),
        ttl: {
            attributeName: 'revisionExpiresAt',
            enabled: true,
        },
        tags: {
            Name: getDynamoDbTableStageName('DOCUMENTS', ORG_NAME, STAGE),
        },
    }, resourceOpts)

    const documentsMetaTable = new aws.dynamodb.Table(getDynamoDbTableStageName('DOCUMENTS_META', ORG_NAME, STAGE), {
        name: getDynamoDbTableStageName('DOCUMENTS_META', ORG_NAME, STAGE),
        attributes: [
            { name: 'documentId', type: 'S' },
        ],
        billingMode: 'PAY_PER_REQUEST',
        hashKey: 'documentId',
        ...(enableDeletionProtection && { deletionProtectionEnabled: true }),
        ...(enableStreams && {
            streamEnabled: true as const,
            streamViewType: 'NEW_AND_OLD_IMAGES' as const,
        }),
        tags: {
            Name: getDynamoDbTableStageName('DOCUMENTS_META', ORG_NAME, STAGE),
        },
    }, resourceOpts)

    const documentsAccessListTable = new aws.dynamodb.Table(getDynamoDbTableStageName('DOCUMENTS_ACCESS_LIST', ORG_NAME, STAGE), {
        name: getDynamoDbTableStageName('DOCUMENTS_ACCESS_LIST', ORG_NAME, STAGE),
        attributes: [
            { name: 'userId', type: 'S' },
            { name: 'documentId', type: 'S' },
            { name: 'createdAt', type: 'N' },
        ],
        billingMode: 'PAY_PER_REQUEST',
        hashKey: 'userId',
        rangeKey: 'documentId',
        localSecondaryIndexes: [
            {
                name: 'createdAt',
                rangeKey: 'createdAt',
                projectionType: 'ALL',
            },
            {
                name: 'updatedAt',
                rangeKey: 'createdAt',
                projectionType: 'ALL',
            },
        ],
        ...(enableDeletionProtection && { deletionProtectionEnabled: true }),
        ...(enableStreams && {
            streamEnabled: true as const,
            streamViewType: 'NEW_AND_OLD_IMAGES' as const,
        }),
        tags: {
            Name: getDynamoDbTableStageName('DOCUMENTS_ACCESS_LIST', ORG_NAME, STAGE),
        },
    }, resourceOpts)

    // Billing ----------------------------------------------------------------------
    const aiTokensUsageTransactionsTable = new aws.dynamodb.Table(getDynamoDbTableStageName('AI_TOKENS_USAGE_TRANSACTIONS', ORG_NAME, STAGE), {
        name: getDynamoDbTableStageName('AI_TOKENS_USAGE_TRANSACTIONS', ORG_NAME, STAGE),
        attributes: [
            { name: 'userId', type: 'S' },
            { name: 'transactionProcessedAt', type: 'N' },
            { name: 'documentId', type: 'S' },
            { name: 'aiModel', type: 'S' },
            { name: 'organizationId', type: 'S' },
            { name: 'transactionProcessedAtFormatted', type: 'S' },
        ],
        billingMode: 'PAY_PER_REQUEST',
        hashKey: 'userId',
        rangeKey: 'transactionProcessedAt',
        localSecondaryIndexes: [
            {
                name: 'documentId',
                rangeKey: 'documentId',
                projectionType: 'ALL',
            },
            {
                name: 'aiModel',
                rangeKey: 'aiModel',
                projectionType: 'ALL',
            },
            {
                name: 'organizationId',
                rangeKey: 'organizationId',
                projectionType: 'ALL',
            },
            {
                name: 'transactionProcessedAtFormatted',
                rangeKey: 'transactionProcessedAtFormatted',
                projectionType: 'ALL',
            },
        ],
        ...(enableDeletionProtection && { deletionProtectionEnabled: true }),
        ...(enableStreams && {
            streamEnabled: true as const,
            streamViewType: 'NEW_AND_OLD_IMAGES' as const,
        }),
        // tableClass: 'STANDARD_INFREQUENT_ACCESS'    // TODO, make sure to set infrequent access for this table when we reach 25GB storage (because the first 25GB is free for standard tables, but not for infrequent access tables)
        tags: {
            Name: getDynamoDbTableStageName('AI_TOKENS_USAGE_TRANSACTIONS', ORG_NAME, STAGE),
        },
    }, resourceOpts)

    const financialTransactionsTable = new aws.dynamodb.Table(getDynamoDbTableStageName('FINANCIAL_TRANSACTIONS', ORG_NAME, STAGE), {
        name: getDynamoDbTableStageName('FINANCIAL_TRANSACTIONS', ORG_NAME, STAGE),
        attributes: [
            { name: 'userId', type: 'S' },
            { name: 'transactionId', type: 'S' },
            { name: 'status', type: 'S' },
            { name: 'createdAt', type: 'N' },
            { name: 'provider', type: 'S' },
        ],
        billingMode: 'PAY_PER_REQUEST',
        hashKey: 'userId',
        rangeKey: 'transactionId',
        localSecondaryIndexes: [
            {
                name: 'status',
                rangeKey: 'status',
                projectionType: 'ALL',
            },
            {
                name: 'createdAt',
                rangeKey: 'createdAt',
                projectionType: 'ALL',
            },
            {
                name: 'provider',
                rangeKey: 'provider',
                projectionType: 'ALL',
            },
        ],
        ...(enableDeletionProtection && { deletionProtectionEnabled: true }),
        ...(enableStreams && {
            streamEnabled: true as const,
            streamViewType: 'NEW_AND_OLD_IMAGES' as const,
        }),
        tags: {
            Name: getDynamoDbTableStageName('FINANCIAL_TRANSACTIONS', ORG_NAME, STAGE),
        },
    }, resourceOpts)

    const aiTokensUsageReportsTable = new aws.dynamodb.Table(getDynamoDbTableStageName('AI_TOKENS_USAGE_REPORTS', ORG_NAME, STAGE), {
        name: getDynamoDbTableStageName('AI_TOKENS_USAGE_REPORTS', ORG_NAME, STAGE),
        attributes: [
            { name: 'recordKey', type: 'S' },
            { name: 'aiModel', type: 'S' },
            { name: 'organizationId', type: 'S' },
        ],
        billingMode: 'PAY_PER_REQUEST',
        hashKey: 'recordKey',
        rangeKey: 'aiModel',
        localSecondaryIndexes: [
            {
                name: 'organizationId',
                rangeKey: 'organizationId',
                projectionType: 'ALL',
            },
        ],
        ...(enableDeletionProtection && { deletionProtectionEnabled: true }),
        ...(enableStreams && {
            streamEnabled: true as const,
            streamViewType: 'NEW_AND_OLD_IMAGES' as const,
        }),
        tags: {
            Name: getDynamoDbTableStageName('AI_TOKENS_USAGE_REPORTS', ORG_NAME, STAGE),
        },
    }, resourceOpts)

    const aiModelsListTable = new aws.dynamodb.Table(getDynamoDbTableStageName('AI_MODELS_LIST', ORG_NAME, STAGE), {
        name: getDynamoDbTableStageName('AI_MODELS_LIST', ORG_NAME, STAGE),
        attributes: [
            { name: 'provider', type: 'S' },
            { name: 'model', type: 'S' },
        ],
        billingMode: 'PAY_PER_REQUEST',
        hashKey: 'provider',
        rangeKey: 'model',
        ...(enableDeletionProtection && { deletionProtectionEnabled: true }),
        ...(enableStreams && {
            streamEnabled: true as const,
            streamViewType: 'NEW_AND_OLD_IMAGES' as const,
        }),
        tags: {
            Name: getDynamoDbTableStageName('AI_MODELS_LIST', ORG_NAME, STAGE),
        },
    }, resourceOpts)
    // END Billing -------------------------------------------------------------------

    // Create parameter outputs
    const outputs: Record<string, pulumi.Output<string>> = {
        usersTableName: usersTable.name,

        organizationsTableName: organizationsTable.name,
        organizationsAccessListTableName: organizationsAccessListTable.name,

        documentsTableName: documentsTable.name,
        documentsMetaTableName: documentsMetaTable.name,
        documentsAccessListTableName: documentsAccessListTable.name,

        aiTokensUsageTransactionsTableName: aiTokensUsageTransactionsTable.name,
        aiTokensUsageReportsTableName: aiTokensUsageReportsTable.name,
        aiModelsListTableName: aiModelsListTable.name,

        financialTransactionsTableName: financialTransactionsTable.name,
    }

    return {
        usersTable,

        organizationsTable,
        organizationsAccessListTable,

        documentsTable,
        documentsMetaTable,
        documentsAccessListTable,

        aiTokensUsageTransactionsTable,
        aiTokensUsageReportsTable,
        aiModelsListTable,

        financialTransactionsTable,

    // Optional bindings preserved for consumers; undefined in this module
    stripeBillingHandlerLambda: undefined,
    subscriptionBalanceUpdatesSNSTopic: undefined,

        outputs,
    }
}
