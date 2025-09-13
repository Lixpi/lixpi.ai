'use strict';

import chalk from 'chalk'
import { fromSSO } from '@aws-sdk/credential-providers';
import {
    SSMClient,
    GetParameterCommand,
    GetParametersCommand,
    PutParameterCommand,
    DeleteParameterCommand
} from '@aws-sdk/client-ssm';

const logStats = ({ operation, operationType = 'read', parameterName, origin }) => {
    const operationDirection = operationType === 'read' ? '<-' : '->'
    const logOrigin = `SSM ${operationDirection} ${operation}`;

    const parameterInfo = `${parameterName}`;
    console.info(`${chalk.white(logOrigin)} (${parameterInfo}), origin: ${origin}`);
};

class SSMService {
    constructor({
        region = '',
        ssoProfile = '',
        prefix = ''
    }) {
        if (region === '') {
            throw new Error('AWS region must be provided.')
        }

        this.ssmClient = new SSMClient({
            region,
            ...(ssoProfile !== '' && {
                credentials: fromSSO({ profile: ssoProfile })
            })
        });

        this.cache = {};
        this.prefix = prefix;
    }

    async getParameter({ parameterName = '', withDecryption = true, origin = 'unknown' }) {
        if (!parameterName) {
            throw new Error("Parameter name must be provided.");
        }

        const fullParameterName = `${this.prefix}${parameterName}`;

        if (this.cache[parameterName]) {
            logStats({
                operation: 'from cache::getParameter',
                parameterName,
                origin
            });
            return this.cache[parameterName];
        }

        const command = new GetParameterCommand({
            Name: fullParameterName,
            WithDecryption: withDecryption
        });

        try {
            const response = await this.ssmClient.send(command);

            logStats({
                operation: 'getParameter',
                parameterName: fullParameterName,
                origin
            });

            this.cache[parameterName] = response.Parameter.Value;
            return response.Parameter.Value;
        } catch (error) {
            console.error(`Error fetching parameter ${fullParameterName} from SSM:`, error);
        }
    }

    async getParameters({ parameterNames = [], withDecryption = true, origin = 'unknown' }) {
        if (parameterNames.length === 0) {
            throw new Error("Parameter names array must be provided and not be empty.");
        }

        const cachedParameters = {};
        const parametersToFetch = [];

        for (const parameterName of parameterNames) {
            if (this.cache[parameterName]) {
                cachedParameters[parameterName] = this.cache[parameterName];
            } else {
                parametersToFetch.push(`${this.prefix}${parameterName}`);
            }
        }

        if (parametersToFetch.length === 0) {
            logStats({
                operation: 'from cache::getParameters',
                parameterName: parameterNames.join(', '),
                origin
            });
            return cachedParameters;
        }

        const command = new GetParametersCommand({
            Names: parametersToFetch,
            WithDecryption: withDecryption
        });

        try {
            const response = await this.ssmClient.send(command);

            logStats({
                operation: 'getParameters',
                parameterName: parametersToFetch.join(', '),
                origin
            });

            const fetchedParameters = response.Parameters.reduce((acc, param) => {
                const shortName = param.Name.replace(this.prefix, '');
                acc[shortName] = param.Value;
                this.cache[shortName] = param.Value;
                return acc;
            }, {});

            return { ...cachedParameters, ...fetchedParameters };
        } catch (error) {
            console.error(`Error fetching parameters from SSM:`, error);
        }
    }

    async putParameter({ parameterName = '', value = '', type = 'String', origin = 'unknown' }) {
        if (!parameterName || !value) {
            throw new Error("Parameter name and value must be provided.");
        }

        const fullParameterName = `${this.prefix}${parameterName}`;

        const command = new PutParameterCommand({
            Name: fullParameterName,
            Value: value,
            Type: type,
            Overwrite: true
        });

        try {
            const response = await this.ssmClient.send(command);

            logStats({
                operation: 'putParameter',
                parameterName: fullParameterName,
                origin
            });

            this.cache[parameterName] = value;
            return response;
        } catch (error) {
            console.error(`Error putting parameter ${fullParameterName} to SSM:`, error);
        }
    }

    async deleteParameter({ parameterName = '', origin = 'unknown' }) {
        if (!parameterName) {
            throw new Error("Parameter name must be provided.");
        }

        const fullParameterName = `${this.prefix}${parameterName}`;

        const command = new DeleteParameterCommand({
            Name: fullParameterName
        });

        try {
            const response = await this.ssmClient.send(command);

            logStats({
                operation: 'deleteParameter',
                parameterName: fullParameterName,
                origin
            });

            delete this.cache[parameterName];
            return response;
        } catch (error) {
            console.error(`Error deleting parameter ${fullParameterName} from SSM:`, error);
        }
    }
}

export default SSMService;
