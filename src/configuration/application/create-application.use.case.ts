import {
    BadRequestException,
    ConflictException,
    Injectable,
} from '@nestjs/common';

import type {
    TApplication,
    TCreateApplication,
} from '../domain/configuration.entities';
import { ConfigurationGateway } from '../domain/configuration.gateway';

@Injectable()
export class CreateApplicationUseCase {
    constructor(private readonly configurationGateway: ConfigurationGateway) {}

    async execute(applicationInput: TCreateApplication): Promise<TApplication> {
        const applicationName = applicationInput?.name?.trim();
        const applicationIri = applicationInput?.iri?.trim();

        if (!applicationName || !applicationIri) {
            throw new BadRequestException(
                'Informe o nome e a IRI da aplicação.',
            );
        }

        const registeredApplication =
            await this.configurationGateway.findApplicationByIri(
                applicationIri,
            );

        if (registeredApplication) {
            throw new ConflictException('Aplicação já cadastrada.');
        }

        return this.configurationGateway.createApplication({
            name: applicationName,
            iri: applicationIri,
        });
    }
}
